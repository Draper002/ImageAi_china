import type { PaymentPlan } from "@/lib/payment-plans";

export function buildOutTradeNo(userId: string) {
  const suffix = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
  return `IC${Date.now()}${userId.replaceAll("-", "").slice(0, 8)}${suffix}`.slice(0, 64);
}

export function yuanFromCents(amountCents: number) {
  return (amountCents / 100).toFixed(2);
}

export function paymentOrderTitle(plan: PaymentPlan) {
  return `Ai图片生成工作台-${plan.zhName}-${plan.credits}积分`;
}

export function normalizePaymentStatus(status: unknown) {
  return typeof status === "string" ? status : "pending";
}
