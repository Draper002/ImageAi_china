import { describe, expect, test } from "vitest";
import { getPaymentPlan, paymentPlans } from "./payment-plans";

describe("paymentPlans", () => {
  test("keeps all personal payment packs under 50 yuan", () => {
    expect(paymentPlans.every((plan) => plan.amountCents <= 5000)).toBe(true);
  });

  test("finds a plan by id", () => {
    expect(getPaymentPlan("creator")?.credits).toBe(25);
    expect(getPaymentPlan("missing")).toBeNull();
  });
});
