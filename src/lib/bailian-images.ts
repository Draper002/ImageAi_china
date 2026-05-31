import { Buffer } from "node:buffer";

export const DEFAULT_BAILIAN_API_BASE_URL = "https://dashscope.aliyuncs.com/api/v1";
export const BAILIAN_IMAGE_ENDPOINT = "/services/aigc/multimodal-generation/generation";

export type BailianClient = {
  apiKey: string;
  baseUrl: string;
  fetch: typeof fetch;
};

type BailianContentPart = { text: string } | { image: string };

export type BailianRequest = {
  model: string;
  input: {
    messages: [{
      role: "user";
      content: BailianContentPart[];
    }];
  };
  parameters: {
    size: string;
    n: 1;
    watermark: false;
    thinking_mode?: true;
  };
};

type BuildBailianRequestInput = {
  model: string;
  prompt: string;
  aspectRatio: string;
  referenceImageUrl?: string;
};

type GenerateImageInput = BuildBailianRequestInput & {
  client: BailianClient;
};

export function sizeForAspectRatio(aspectRatio: string) {
  switch (aspectRatio) {
    case "4:5":
      return "1344*1680";
    case "16:9":
      return "1664*936";
    case "9:16":
      return "936*1664";
    case "3:2":
      return "1728*1152";
    case "1:1":
    default:
      return "1536*1536";
  }
}

export function buildBailianRequest({
  model,
  prompt,
  aspectRatio,
  referenceImageUrl
}: BuildBailianRequestInput): BailianRequest {
  const content: BailianContentPart[] = referenceImageUrl
    ? [{ image: referenceImageUrl }, { text: prompt }]
    : [{ text: prompt }];

  return {
    model,
    input: {
      messages: [{
        role: "user",
        content
      }]
    },
    parameters: {
      size: sizeForAspectRatio(aspectRatio),
      n: 1,
      watermark: false,
      ...(referenceImageUrl ? {} : { thinking_mode: true })
    }
  };
}

export function extractImageUrl(payload: unknown) {
  if (!isRecord(payload) || !isRecord(payload.output) || !Array.isArray(payload.output.choices)) {
    return undefined;
  }

  for (const choice of payload.output.choices) {
    if (!isRecord(choice) || !isRecord(choice.message) || !Array.isArray(choice.message.content)) {
      continue;
    }

    for (const part of choice.message.content) {
      if (isRecord(part) && typeof part.image === "string") {
        return part.image;
      }
    }
  }

  return undefined;
}

export async function generateImage({
  client,
  model,
  prompt,
  aspectRatio,
  referenceImageUrl
}: GenerateImageInput) {
  const request = buildBailianRequest({ model, prompt, aspectRatio, referenceImageUrl });
  const response = await client.fetch(`${normalizeBaseUrl(client.baseUrl)}${BAILIAN_IMAGE_ENDPOINT}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${client.apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(request)
  });
  const responseText = await response.text();
  const payload = parseJsonResponse(responseText);

  if (!response.ok || hasBailianCode(payload)) {
    throw new Error(formatBailianError(response, payload));
  }

  const imageUrl = extractImageUrl(payload);
  if (!imageUrl) {
    throw new Error("Bailian did not return an image URL.");
  }

  const imageResponse = await client.fetch(imageUrl);
  if (!imageResponse.ok) {
    throw new Error(`Failed to download Bailian image: ${imageResponse.status}`);
  }

  const contentType = imageResponse.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("image/")) {
    throw new Error("Bailian result URL did not return image content.");
  }

  return Buffer.from(await imageResponse.arrayBuffer());
}

export function createBailianClient(
  apiKey: string,
  baseUrl = DEFAULT_BAILIAN_API_BASE_URL
): BailianClient {
  return {
    apiKey,
    baseUrl: normalizeBaseUrl(baseUrl),
    fetch
  };
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function parseJsonResponse(text: string): unknown {
  if (!text) {
    return undefined;
  }

  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasBailianCode(payload: unknown) {
  return isRecord(payload) && typeof payload.code === "string" && payload.code.length > 0;
}

function formatBailianError(response: Response, payload: unknown) {
  const status = `status ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const code = isRecord(payload) && typeof payload.code === "string" ? payload.code : undefined;
  const message = isRecord(payload) && typeof payload.message === "string" ? payload.message : undefined;

  if (code && message) {
    return `Bailian request failed with ${status} code ${code}: ${message}`;
  }

  if (code) {
    return `Bailian request failed with ${status} code ${code}`;
  }

  if (message) {
    return `Bailian request failed with ${status}: ${message}`;
  }

  return `Bailian request failed with ${status}`;
}
