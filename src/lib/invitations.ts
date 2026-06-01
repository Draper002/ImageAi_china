import type { SupabaseClient } from "@supabase/supabase-js";

export type InvitationRewardStatus = "pending" | "settled" | "reversed";
export type InvitationRewardType = "signup" | "payment";

export type InvitationSummaryRow = {
  invitedUserId: string;
  maskedUser: string;
  registeredAt: string;
  totalPaidCents: number;
  rewardCredits: number;
  status: InvitationRewardStatus;
};

export type InvitationSummary = {
  code: string;
  inviteUrl: string;
  invitedCount: number;
  totalPaidCents: number;
  totalRewardCredits: number;
  pendingRewardCredits: number;
  rows: InvitationSummaryRow[];
};

type SupabaseLike = Pick<SupabaseClient, "from">;

type ProfileRow = {
  user_id: string;
  email: string | null;
  created_at: string;
  invitation_code: string | null;
};

type PaymentOrderRow = {
  user_id: string;
  amount_cents: number;
};

type RewardRow = {
  invited_user_id: string;
  amount: number;
  status: InvitationRewardStatus;
};

export function normalizeInviteCode(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

export function generateInvitationCode(userId: string) {
  const compactUserId = String(userId ?? "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  return `INV-${compactUserId.slice(0, 8).padEnd(8, "0")}`;
}

export function resolveInvitationCode(profileCode: unknown, userId: string) {
  return normalizeInviteCode(profileCode) || generateInvitationCode(userId);
}

export function calculateReferralPaymentReward(credits: number) {
  return Math.ceil(Math.max(0, credits) * 0.3);
}

export function buildInvitationUrl(baseUrl: string, code: string) {
  const url = new URL("/login", baseUrl);
  url.searchParams.set("mode", "signup");
  url.searchParams.set("invite", normalizeInviteCode(code));
  return url.toString();
}

export function maskInviteeIdentifier(value: string | null | undefined) {
  const identifier = String(value ?? "").trim();
  if (!identifier) return "未设置账号";

  if (identifier.includes("@")) {
    const [name, domain = ""] = identifier.split("@");
    const [domainName = "", ...rest] = domain.split(".");
    const suffix = rest.length > 0 ? rest.at(-1) : "";
    const visibleName = name.slice(0, 2).padEnd(Math.min(2, Math.max(name.length, 1)), "*");
    return `${visibleName}***@${domainName.slice(0, 1)}***${suffix ? `.${suffix}` : ""}`;
  }

  return `${identifier.slice(0, 2)}***${identifier.slice(-1)}`;
}

export function centsToYuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export async function getInvitationSummary({
  admin,
  userId,
  baseUrl
}: {
  admin: SupabaseLike;
  userId: string;
  baseUrl: string;
}): Promise<InvitationSummary> {
  const { data: profile } = await admin
    .from("profiles")
    .select("invitation_code")
    .eq("user_id", userId)
    .single<Pick<ProfileRow, "invitation_code">>();
  let code = resolveInvitationCode(profile?.invitation_code, userId);

  if (!normalizeInviteCode(profile?.invitation_code)) {
    const { data: updatedProfile } = await admin
      .from("profiles")
      .update({ invitation_code: code, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("invitation_code", null)
      .select("invitation_code")
      .maybeSingle<Pick<ProfileRow, "invitation_code">>();
    code = normalizeInviteCode(updatedProfile?.invitation_code) || code;
  }

  const inviteUrl = code ? buildInvitationUrl(baseUrl, code) : "";

  const { data: invitedProfiles } = await admin
    .from("profiles")
    .select("user_id,email,created_at,invitation_code")
    .eq("referred_by_user_id", userId)
    .order("created_at", { ascending: false })
    .returns<ProfileRow[]>();

  const invitees = invitedProfiles ?? [];
  const invitedIds = invitees.map((item) => item.user_id);
  const paidByUser = new Map<string, number>();
  const rewardByUser = new Map<string, { credits: number; status: InvitationRewardStatus }>();

  if (invitedIds.length > 0) {
    const { data: payments } = await admin
      .from("payment_orders")
      .select("user_id,amount_cents")
      .in("user_id", invitedIds)
      .eq("status", "paid")
      .returns<PaymentOrderRow[]>();

    for (const payment of payments ?? []) {
      paidByUser.set(payment.user_id, (paidByUser.get(payment.user_id) ?? 0) + payment.amount_cents);
    }

    const { data: rewards } = await admin
      .from("invitation_rewards")
      .select("invited_user_id,amount,status")
      .eq("inviter_user_id", userId)
      .in("invited_user_id", invitedIds)
      .returns<RewardRow[]>();

    for (const reward of rewards ?? []) {
      const current = rewardByUser.get(reward.invited_user_id) ?? { credits: 0, status: "settled" as InvitationRewardStatus };
      current.credits += reward.amount;
      if (reward.status === "pending") current.status = "pending";
      if (reward.status === "reversed" && current.status !== "pending") current.status = "reversed";
      rewardByUser.set(reward.invited_user_id, current);
    }
  }

  const rows = invitees.map((invitee) => {
    const reward = rewardByUser.get(invitee.user_id) ?? { credits: 0, status: "settled" as InvitationRewardStatus };
    return {
      invitedUserId: invitee.user_id,
      maskedUser: maskInviteeIdentifier(invitee.email),
      registeredAt: invitee.created_at,
      totalPaidCents: paidByUser.get(invitee.user_id) ?? 0,
      rewardCredits: reward.credits,
      status: reward.status
    };
  });

  return {
    code,
    inviteUrl,
    invitedCount: rows.length,
    totalPaidCents: rows.reduce((sum, row) => sum + row.totalPaidCents, 0),
    totalRewardCredits: rows.reduce((sum, row) => sum + row.rewardCredits, 0),
    pendingRewardCredits: rows.filter((row) => row.status === "pending").reduce((sum, row) => sum + row.rewardCredits, 0),
    rows
  };
}
