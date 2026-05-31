import { afterEach, describe, expect, test, vi } from "vitest";
import { paymentPlans } from "./payment-plans";
import { buildOutTradeNo, paymentOrderTitle, yuanFromCents } from "./payments";

describe("payments helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("formats cents for Alipay yuan amounts", () => {
    expect(yuanFromCents(990)).toBe("9.90");
    expect(yuanFromCents(1990)).toBe("19.90");
  });

  test("builds Alipay order ids within the provider limit", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_786_000_000_000);
    const outTradeNo = buildOutTradeNo("3f5fd238-70f5-4f2c-968b-8777be50c946");

    expect(outTradeNo).toMatch(/^IC17860000000003f5fd238/);
    expect(outTradeNo.length).toBeLessThanOrEqual(64);
  });

  test("builds a readable order title", () => {
    expect(paymentOrderTitle(paymentPlans[0])).toContain("体验包");
  });
});
