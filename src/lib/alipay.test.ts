import { afterEach, describe, expect, it, test } from "vitest";
import { formatAlipayTimestamp, isAlipayResponseSignatureValidationEnabled, isPaidAlipayTradeStatus } from "./alipay";

const originalValidateSign = process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE;

describe("isPaidAlipayTradeStatus", () => {
  test("recognizes successful Alipay trade statuses", () => {
    expect(isPaidAlipayTradeStatus("TRADE_SUCCESS")).toBe(true);
    expect(isPaidAlipayTradeStatus("TRADE_FINISHED")).toBe(true);
    expect(isPaidAlipayTradeStatus("WAIT_BUYER_PAY")).toBe(false);
    expect(isPaidAlipayTradeStatus(null)).toBe(false);
  });
});

describe("isAlipayResponseSignatureValidationEnabled", () => {
  afterEach(() => {
    process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE = originalValidateSign;
  });

  test("defaults response signature validation off to match Alipay SDK exec behavior", () => {
    delete process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE;

    expect(isAlipayResponseSignatureValidationEnabled()).toBe(false);
  });

  test("allows explicit opt-in for response signature validation", () => {
    process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE = "true";
    expect(isAlipayResponseSignatureValidationEnabled()).toBe(true);

    process.env.ALIPAY_VALIDATE_RESPONSE_SIGNATURE = "1";
    expect(isAlipayResponseSignatureValidationEnabled()).toBe(true);
  });
});

describe("formatAlipayTimestamp", () => {
  it("uses Alipay-compatible 00 hour at Asia/Shanghai midnight", () => {
    expect(formatAlipayTimestamp(new Date("2026-05-31T16:00:00Z"))).toBe("2026-06-01 00:00:00");
  });
});
