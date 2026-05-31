"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircledIcon, Cross2Icon } from "@radix-ui/react-icons";
import { Button } from "@/components/ui/button";
import { paymentPlans, type PaymentPlanId } from "@/lib/payment-plans";
import type { Locale } from "@/lib/presets";
import { cn } from "@/lib/utils";

type RechargeButtonProps = {
  className?: string;
  label?: string;
  locale?: Locale;
};

type PaymentResponse = {
  orderId?: string;
  status?: string;
  payUrl?: string | null;
  qrCodeUrl?: string | null;
  error?: string;
};

const copy = {
  zh: {
    trigger: "充值积分",
    title: "充值积分",
    description: "选择套餐后生成支付宝收款链接，支付成功后积分自动到账。",
    close: "关闭",
    groupLabel: "充值方案",
    credits: "积分",
    amountDue: "应付金额",
    paymentReady: "支付订单已创建。请用支付宝扫码，或打开支付链接完成付款。",
    waiting: "等待支付确认，页面会自动查询到账状态。",
    paid: "支付已到账，积分已增加。",
    createPayment: "生成支付宝付款码",
    creating: "正在创建订单...",
    openPay: "打开支付链接",
    checkNow: "我已支付，刷新状态",
    checking: "正在确认...",
    reload: "刷新页面查看积分",
    createFailed: "支付订单创建失败，请稍后重试。",
    statusFailed: "暂时无法确认支付状态，请稍后再点刷新。"
  },
  en: {
    trigger: "Recharge credits",
    title: "Recharge credits",
    description: "Choose a pack, pay with Alipay, and credits are added after confirmation.",
    close: "Close",
    groupLabel: "Recharge plans",
    credits: "credits",
    amountDue: "Amount due",
    paymentReady: "Payment order created. Scan with Alipay or open the payment link.",
    waiting: "Waiting for payment confirmation. This panel checks status automatically.",
    paid: "Payment confirmed. Credits have been added.",
    createPayment: "Create Alipay QR",
    creating: "Creating order...",
    openPay: "Open payment link",
    checkNow: "I paid, check status",
    checking: "Checking...",
    reload: "Reload to view credits",
    createFailed: "Unable to create payment order. Try again later.",
    statusFailed: "Unable to confirm payment yet. Try checking again shortly."
  }
} satisfies Record<Locale, {
  trigger: string;
  title: string;
  description: string;
  close: string;
  groupLabel: string;
  credits: string;
  amountDue: string;
  paymentReady: string;
  waiting: string;
  paid: string;
  createPayment: string;
  creating: string;
  openPay: string;
  checkNow: string;
  checking: string;
  reload: string;
  createFailed: string;
  statusFailed: string;
}>;

export function RechargeButton({ className = "button primary", label, locale = "zh" }: RechargeButtonProps) {
  const t = copy[locale];
  const [selectedPlanId, setSelectedPlanId] = useState<PaymentPlanId>("creator");
  const [payment, setPayment] = useState<PaymentResponse | null>(null);
  const [paymentStatus, setPaymentStatus] = useState("idle");
  const [isCreating, setIsCreating] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState("");
  const selectedPlan = paymentPlans.find((plan) => plan.id === selectedPlanId) ?? paymentPlans[0];
  const isPaid = paymentStatus === "paid";

  function resetDialogState() {
    setSelectedPlanId("creator");
    setPayment(null);
    setPaymentStatus("idle");
    setIsCreating(false);
    setIsChecking(false);
    setError("");
  }

  async function startPayment() {
    setIsCreating(true);
    setError("");
    setPayment(null);
    setPaymentStatus("idle");

    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ planId: selectedPlan.id })
      });
      const result = await response.json().catch(() => ({})) as PaymentResponse;
      if (!response.ok) {
        setError(result.error || t.createFailed);
        return;
      }

      setPayment(result);
      setPaymentStatus(result.status || "pending");
    } catch {
      setError(t.createFailed);
    } finally {
      setIsCreating(false);
    }
  }

  const checkPayment = useCallback(async (silent = false) => {
    if (!payment?.orderId || paymentStatus === "paid") return;
    if (!silent) setIsChecking(true);
    setError("");

    try {
      const response = await fetch(`/api/payments/status?orderId=${encodeURIComponent(payment.orderId)}`, {
        cache: "no-store"
      });
      const result = await response.json().catch(() => ({})) as PaymentResponse;
      if (!response.ok) {
        setError(result.error || t.statusFailed);
        return;
      }

      setPaymentStatus(result.status || "pending");
    } catch {
      if (!silent) setError(t.statusFailed);
    } finally {
      if (!silent) setIsChecking(false);
    }
  }, [payment?.orderId, paymentStatus, t.statusFailed]);

  useEffect(() => {
    if (!payment?.orderId || paymentStatus === "paid") return;
    const timer = window.setInterval(() => void checkPayment(true), 4000);
    return () => window.clearInterval(timer);
  }, [checkPayment, payment?.orderId, paymentStatus]);

  return (
    <Dialog.Root onOpenChange={(open) => open && resetDialogState()}>
      <Dialog.Trigger asChild>
        <button className={className} type="button">
          {label ?? t.trigger}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(38rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-[1.6rem] border border-white/20 bg-white p-5 shadow-[0_28px_90px_-34px_rgba(24,24,27,0.75)]"
        >
          <div className="section-title">
            <div>
              <Dialog.Title className="text-2xl font-semibold tracking-[-0.04em] text-zinc-950">
                {t.title}
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-zinc-500">
                {t.description}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="icon-button" type="button" aria-label={t.close}>
                <Cross2Icon className="mx-auto h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <div className="recharge-options" role="group" aria-label={t.groupLabel}>
            {paymentPlans.map((plan) => (
              <button
                className={cn("recharge-card recharge-plan", selectedPlanId === plan.id && "is-selected")}
                type="button"
                aria-pressed={selectedPlanId === plan.id}
                onClick={() => {
                  setSelectedPlanId(plan.id);
                  setPayment(null);
                  setPaymentStatus("idle");
                  setError("");
                }}
                key={plan.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3>{locale === "en" ? plan.enName : plan.zhName}</h3>
                    <strong>¥{plan.amountYuan}</strong>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {plan.credits} {t.credits}
                    </p>
                  </div>
                  {selectedPlanId === plan.id ? <CheckCircledIcon className="h-5 w-5 text-emerald-700" /> : null}
                </div>
              </button>
            ))}
          </div>

          <div className="recharge-plan-detail">
            <p>{locale === "en" ? selectedPlan.enDescription : selectedPlan.zhDescription}</p>
            <p className="recharge-price">{t.amountDue}: ¥{selectedPlan.amountYuan}</p>

            {payment ? (
              <div className="recharge-status">
                <p className={cn("text-sm font-semibold", isPaid ? "text-emerald-700" : "text-zinc-700")}>
                  {isPaid ? t.paid : t.paymentReady}
                </p>
                {!isPaid ? <p className="mt-1 text-xs text-zinc-500">{t.waiting}</p> : null}
                {payment.qrCodeUrl ? (
                  <img className="recharge-qr" src={payment.qrCodeUrl} alt={locale === "en" ? "Alipay payment QR code" : "支付宝付款二维码"} />
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {payment.payUrl && !isPaid ? (
                    <Button asChild size="sm" variant="secondary">
                      <a href={payment.payUrl} target="_blank" rel="noreferrer">{t.openPay}</a>
                    </Button>
                  ) : null}
                  {isPaid ? (
                    <Button size="sm" type="button" variant="accent" onClick={() => window.location.reload()}>
                      {t.reload}
                    </Button>
                  ) : (
                    <Button size="sm" type="button" variant="accent" onClick={() => void checkPayment()} disabled={isChecking}>
                      {isChecking ? t.checking : t.checkNow}
                    </Button>
                  )}
                </div>
              </div>
            ) : null}

            {error ? <p className="mt-3 text-sm font-semibold text-red-600">{error}</p> : null}
          </div>

          <Button className="mt-4 w-full" type="button" variant="accent" onClick={() => void startPayment()} disabled={isCreating || isPaid}>
            {isCreating ? t.creating : t.createPayment}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
