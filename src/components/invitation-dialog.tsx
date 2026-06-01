"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Cross2Icon, Link2Icon } from "@radix-ui/react-icons";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";
import { centsToYuan, type InvitationSummary, type InvitationSummaryRow } from "@/lib/invitations";
import type { Locale } from "@/lib/presets";
import { cn } from "@/lib/utils";

type InvitationButtonProps = {
  className?: string;
  icon?: ReactNode;
  label?: string;
  locale?: Locale;
};

const copy = {
  zh: {
    trigger: "我的邀请",
    title: "我的邀请",
    description: "复制邀请链接或二维码给朋友，注册与付费奖励会自动入账。",
    close: "关闭",
    linkLabel: "专属邀请链接",
    copyLink: "复制链接",
    copied: "已复制",
    invited: "已邀请注册",
    reward: "累计奖励",
    paid: "邀请充值额",
    credits: "积分",
    rules: "奖励规则",
    signupRule: "新用户完成注册：邀请人立即获赠 1 积分。",
    paymentRule: "新用户付费成功：按该套餐积分的 30% 向上取整奖励。",
    riskRule: "退款、异常订单或自邀请会冻结或扣回对应奖励。",
    recent: "最近邀请",
    empty: "还没有邀请记录。",
    user: "被邀请用户",
    registeredAt: "注册日期",
    paidAmount: "充值费用",
    rewardCredits: "奖励积分",
    status: "状态",
    settled: "已入账",
    pending: "待结算",
    reversed: "已扣回",
    loading: "正在读取邀请信息...",
    failed: "邀请信息读取失败，请稍后再试。",
    qrAlt: "邀请二维码"
  },
  en: {
    trigger: "My invitations",
    title: "My invitations",
    description: "Share your invite link or QR code. Registration and payment rewards are credited automatically.",
    close: "Close",
    linkLabel: "Invite link",
    copyLink: "Copy link",
    copied: "Copied",
    invited: "Invited users",
    reward: "Total rewards",
    paid: "Invited payments",
    credits: "credits",
    rules: "Reward rules",
    signupRule: "New user registers: inviter receives 1 credit.",
    paymentRule: "New user pays: inviter receives 30% of package credits, rounded up.",
    riskRule: "Refunds, suspicious orders, or self-invites may freeze or reverse rewards.",
    recent: "Recent invites",
    empty: "No invitation records yet.",
    user: "Invited user",
    registeredAt: "Registered",
    paidAmount: "Paid",
    rewardCredits: "Reward",
    status: "Status",
    settled: "Settled",
    pending: "Pending",
    reversed: "Reversed",
    loading: "Loading invitation details...",
    failed: "Unable to load invitations. Try again later.",
    qrAlt: "Invitation QR code"
  }
} satisfies Record<Locale, Record<string, string>>;

function formatDate(value: string, locale: Locale) {
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "zh-CN");
}

function statusText(row: InvitationSummaryRow, locale: Locale) {
  const t = copy[locale];
  if (row.status === "pending") return t.pending;
  if (row.status === "reversed") return t.reversed;
  return t.settled;
}

export function InvitationButton({ className = "button secondary", icon, label, locale = "zh" }: InvitationButtonProps) {
  const t = copy[locale];
  const [summary, setSummary] = useState<InvitationSummary | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const triggerIcon = icon ?? (className.includes("account-action") ? <Link2Icon className="h-4 w-4" /> : null);

  async function loadInvitation() {
    setIsLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/invitations", { cache: "no-store" });
      const result = await response.json().catch(() => ({})) as InvitationSummary & { error?: string };
      if (!response.ok) {
        setError(result.error || t.failed);
        setSummary(null);
        return;
      }
      setSummary(result);
    } catch {
      setError(t.failed);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!summary?.inviteUrl) {
      setQrDataUrl("");
      return;
    }

    let isMounted = true;
    QRCode.toDataURL(summary.inviteUrl, { margin: 1, width: 176 })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (isMounted) setQrDataUrl("");
      });

    return () => {
      isMounted = false;
    };
  }, [summary?.inviteUrl]);

  const rows = useMemo(() => summary?.rows.slice(0, 5) ?? [], [summary?.rows]);

  async function copyInviteLink() {
    if (!summary?.inviteUrl) return;
    await navigator.clipboard?.writeText(summary.inviteUrl);
    setCopied(true);
  }

  return (
    <Dialog.Root onOpenChange={(open) => open && void loadInvitation()}>
      <Dialog.Trigger asChild>
        <button className={className} type="button">
          {triggerIcon ? <span className="inline-flex shrink-0" aria-hidden="true">{triggerIcon}</span> : null}
          {label ?? t.trigger}
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/45 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[min(46rem,calc(100dvh-2rem))] w-[min(46rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-[1.6rem] border border-white/20 bg-white p-5 shadow-[0_28px_90px_-34px_rgba(24,24,27,0.75)]">
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

          {isLoading ? <p className="mt-5 text-sm font-semibold text-zinc-600">{t.loading}</p> : null}
          {error ? <p className="mt-5 text-sm font-semibold text-red-600">{error}</p> : null}

          {summary ? (
            <div className="mt-5 grid gap-5">
              <div>
                <p className="text-sm font-semibold text-zinc-950">{t.linkLabel}</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <div className="rounded-[1rem] border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800">
                    {summary.inviteUrl}
                  </div>
                  <Button type="button" variant="accent" onClick={() => void copyInviteLink()}>
                    {copied ? t.copied : t.copyLink}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: t.invited, value: `${summary.invitedCount}` },
                  { label: t.reward, value: `${summary.totalRewardCredits} ${t.credits}` },
                  { label: t.paid, value: centsToYuan(summary.totalPaidCents) }
                ].map((item) => (
                  <div className="rounded-[1rem] border border-zinc-200 bg-white p-4" key={item.label}>
                    <p className="text-xs font-semibold text-zinc-500">{item.label}</p>
                    <strong className="mt-3 block text-2xl tracking-[-0.04em] text-emerald-700">{item.value}</strong>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-[11rem_1fr]">
                <div>
                  {qrDataUrl ? <img className="rounded-[1rem] border border-zinc-200 bg-white p-2" src={qrDataUrl} alt={t.qrAlt} /> : null}
                </div>
                <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 p-4">
                  <h3 className="font-semibold text-emerald-800">{t.rules}</h3>
                  <div className="mt-3 grid gap-2 text-sm leading-6 text-zinc-700">
                    <p>{t.signupRule}</p>
                    <p>{t.paymentRule}</p>
                    <p>{t.riskRule}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold tracking-tight text-zinc-950">{t.recent}</h3>
                {rows.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-[1rem] border border-zinc-200">
                    <div className="grid grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_0.7fr] bg-zinc-50 px-4 py-3 text-xs font-semibold text-zinc-500">
                      <span>{t.user}</span>
                      <span>{t.registeredAt}</span>
                      <span>{t.paidAmount}</span>
                      <span>{t.rewardCredits}</span>
                      <span>{t.status}</span>
                    </div>
                    {rows.map((row) => (
                      <div className="grid grid-cols-[1.4fr_0.9fr_0.8fr_0.8fr_0.7fr] border-t border-zinc-200 px-4 py-3 text-sm text-zinc-800" key={row.invitedUserId}>
                        <span>{row.maskedUser}</span>
                        <span>{formatDate(row.registeredAt, locale)}</span>
                        <span>{centsToYuan(row.totalPaidCents)}</span>
                        <span className="font-semibold text-emerald-700">+{row.rewardCredits}</span>
                        <span className={cn("font-semibold", row.status === "pending" && "text-amber-700", row.status === "reversed" && "text-red-600", row.status === "settled" && "text-zinc-800")}>
                          {statusText(row, locale)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-[1rem] border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
                    {t.empty}
                  </p>
                )}
              </div>
            </div>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
