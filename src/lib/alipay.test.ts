import { describe, expect, test } from "vitest";
import { isPaidAlipayTradeStatus } from "./alipay";

describe("isPaidAlipayTradeStatus", () => {
  test("recognizes successful Alipay trade statuses", () => {
    expect(isPaidAlipayTradeStatus("TRADE_SUCCESS")).toBe(true);
    expect(isPaidAlipayTradeStatus("TRADE_FINISHED")).toBe(true);
    expect(isPaidAlipayTradeStatus("WAIT_BUYER_PAY")).toBe(false);
    expect(isPaidAlipayTradeStatus(null)).toBe(false);
  });
});
