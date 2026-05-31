import { createSign, createVerify } from "node:crypto";

type AlipayConfig = {
  appId: string;
  privateKey: string;
  alipayPublicKey: string;
  gateway: string;
  signType: "RSA2";
  agentName: string;
  agentId: string;
};

type AlipayResponse = Record<string, unknown> & {
  code?: string;
  msg?: string;
  sub_code?: string;
  sub_msg?: string;
  pay_url?: string;
  pic_url?: string;
  trade_status?: string;
  total_amount?: string;
  trade_no?: string;
};

export type CreateAlipayAgentPaymentInput = {
  outTradeNo: string;
  totalAmount: string;
  agentName?: string;
};

export type CreateAlipayAgentPaymentResult = {
  raw: AlipayResponse;
  payUrl: string | null;
  qrCodeUrl: string | null;
};

export type QueryAlipayPaymentResult = {
  raw: AlipayResponse;
  tradeStatus: string | null;
  totalAmount: string | null;
  tradeNo: string | null;
};

function firstEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }

  return undefined;
}

function normalizeKey(value: string) {
  return value
    .replace(/-----BEGIN [^-]+-----/g, "")
    .replace(/-----END [^-]+-----/g, "")
    .replace(/\s+/g, "");
}

function toPem(value: string, label: "PRIVATE KEY" | "PUBLIC KEY") {
  const body = normalizeKey(value);
  const lines = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----`;
}

export function formatAlipayTimestamp(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = map.hour === "24" ? "00" : map.hour;
  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
}

function encodeForm(params: Record<string, string>) {
  return new URLSearchParams(params).toString();
}

function signParams(params: Record<string, string>, privateKey: string) {
  const content = Object.keys(params)
    .filter((key) => key !== "sign" && params[key] !== "")
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return createSign("RSA-SHA256").update(content, "utf8").sign(toPem(privateKey, "PRIVATE KEY"), "base64");
}

function responseKeyFor(method: string) {
  return `${method.replaceAll(".", "_")}_response`;
}

function responseSignContent(rawText: string, responseKey: string) {
  const trimmed = rawText.trim();
  const keyIndex = trimmed.indexOf(`"${responseKey}"`);
  const signIndex = trimmed.lastIndexOf('"sign"');
  if (keyIndex === -1 || signIndex === -1) return null;

  let content = trimmed.substring(keyIndex + responseKey.length + 3, signIndex);
  content = content.replace(/^[^{]*{/g, "{");
  content = content.replace(/\}([^}]*)$/g, "}");
  return content;
}

function verifyAlipayResponse(rawText: string, method: string, sign: string | undefined, publicKey: string) {
  if (!sign) throw new Error("Alipay response is missing signature");

  const content = responseSignContent(rawText, responseKeyFor(method));
  if (!content) throw new Error("Unable to build Alipay response signature content");

  const verifier = createVerify("RSA-SHA256");
  verifier.update(content, "utf8");
  if (!verifier.verify(toPem(publicKey, "PUBLIC KEY"), sign, "base64")) {
    throw new Error("Alipay response signature verification failed");
  }
}

export function isAlipayResponseSignatureValidationEnabled() {
  return process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE === "true" || process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE === "1";
}

export function getAlipayConfig(): AlipayConfig {
  const appId = firstEnv("ALIPAY_APP_ID", "AP_APP_ID");
  const privateKey = firstEnv("ALIPAY_PRIVATE_KEY", "AP_APP_KEY");
  const alipayPublicKey = firstEnv("ALIPAY_PUBLIC_KEY", "AP_PUB_KEY");

  if (!appId) throw new Error("Missing environment variable: ALIPAY_APP_ID");
  if (!privateKey) throw new Error("Missing environment variable: ALIPAY_PRIVATE_KEY");
  if (!alipayPublicKey) throw new Error("Missing environment variable: ALIPAY_PUBLIC_KEY");

  return {
    appId,
    privateKey,
    alipayPublicKey,
    gateway: process.env.ALIPAY_GATEWAY || "https://openapi.alipay.com/gateway.do",
    signType: "RSA2",
    agentName: process.env.ALIPAY_AGENT_NAME || "Ai图片生成工作台",
    agentId: process.env.ALIPAY_AGENT_ID || "mock_agent_id"
  };
}

async function requestAlipay(method: string, bizContent: Record<string, unknown>) {
  const config = getAlipayConfig();
  const params: Record<string, string> = {
    app_id: config.appId,
    method,
    format: "JSON",
    charset: "utf-8",
    sign_type: config.signType,
    timestamp: formatAlipayTimestamp(),
    version: "1.0",
    x_open_scene: "MCP",
    biz_content: JSON.stringify(bizContent)
  };
  params.sign = signParams(params, config.privateKey);

  const response = await fetch(config.gateway, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded;charset=utf-8"
    },
    body: encodeForm(params),
    cache: "no-store"
  });

  const rawText = await response.text();
  if (!response.ok) {
    throw new Error(`Alipay request failed with HTTP ${response.status}`);
  }

  const payload = JSON.parse(rawText) as Record<string, unknown>;
  const responseKey = responseKeyFor(method);
  const data = (payload[responseKey] ?? payload.error_response) as AlipayResponse | undefined;
  if (!data) throw new Error(`Alipay response is missing ${responseKey}`);

  if (data.code !== "10000") {
    throw new Error(data.sub_msg || data.msg || "Alipay request was rejected");
  }

  if (isAlipayResponseSignatureValidationEnabled()) {
    verifyAlipayResponse(rawText, method, payload.sign as string | undefined, config.alipayPublicKey);
  }

  return data;
}

export async function createAlipayAgentPayment(input: CreateAlipayAgentPaymentInput): Promise<CreateAlipayAgentPaymentResult> {
  const config = getAlipayConfig();
  const raw = await requestAlipay("alipay.aipay.trade.precreate", {
    out_trade_no: input.outTradeNo,
    amount: input.totalAmount,
    agent_name: input.agentName || config.agentName,
    agent_id: config.agentId,
    request_channel_source: "imageai_china"
  });
  const qrCodeUrl = raw.pic_url ? `${String(raw.pic_url)}&trans=false` : null;

  return {
    raw,
    payUrl: raw.pay_url ? String(raw.pay_url) : null,
    qrCodeUrl
  };
}

export async function queryAlipayPayment(outTradeNo: string): Promise<QueryAlipayPaymentResult> {
  const raw = await requestAlipay("alipay.trade.query", {
    out_trade_no: outTradeNo,
    extend_params: {
      request_channel_source: "imageai_china"
    }
  });

  return {
    raw,
    tradeStatus: raw.trade_status ? String(raw.trade_status) : null,
    totalAmount: raw.total_amount ? String(raw.total_amount) : null,
    tradeNo: raw.trade_no ? String(raw.trade_no) : null
  };
}

export function isPaidAlipayTradeStatus(status: string | null) {
  return status === "TRADE_SUCCESS" || status === "TRADE_FINISHED";
}
