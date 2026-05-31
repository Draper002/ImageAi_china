export type PaymentPlan = {
  id: string;
  credits: number;
  amountCents: number;
  amountYuan: string;
  zhName: string;
  enName: string;
  zhDescription: string;
  enDescription: string;
};

export const paymentPlans = [
  {
    id: "starter",
    credits: 10,
    amountCents: 990,
    amountYuan: "9.90",
    zhName: "体验包",
    enName: "Starter",
    zhDescription: "适合先小额试用，10 次图片生成。",
    enDescription: "A small pack for trying paid generation."
  },
  {
    id: "creator",
    credits: 25,
    amountCents: 1990,
    amountYuan: "19.90",
    zhName: "创作包",
    enName: "Creator",
    zhDescription: "适合日常批量生成，单次成本更低。",
    enDescription: "For regular image creation with a lower unit cost."
  },
  {
    id: "studio",
    credits: 70,
    amountCents: 4990,
    amountYuan: "49.90",
    zhName: "工作室包",
    enName: "Studio",
    zhDescription: "适合集中产出图片素材，当前最高档仍低于 50 元。",
    enDescription: "For focused production runs while staying under 50 yuan."
  }
] as const satisfies readonly PaymentPlan[];

export type PaymentPlanId = (typeof paymentPlans)[number]["id"];

export function getPaymentPlan(planId: string): PaymentPlan | null {
  return paymentPlans.find((plan) => plan.id === planId) ?? null;
}
