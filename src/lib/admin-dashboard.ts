import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "./supabase/admin";

export type AdminProfileRow = {
  user_id: string;
  email: string | null;
  credit_balance: number;
  created_at: string;
};

export type AdminLedgerRow = {
  user_id: string;
  amount: number;
  reason: string;
};

export type AdminPaymentRow = {
  user_id: string;
  amount_cents: number;
  credit_amount: number;
  status: string;
};

export type AdminGenerationSummaryRow = {
  user_id: string;
  status: string;
};

export type AdminUserSummary = {
  userId: string;
  email: string;
  credits: number;
  joinedAt: string;
  paidCents: number;
  purchasedCredits: number;
  usedCredits: number;
  rewardCredits: number;
  generationCount: number;
};

export type AdminGenerationRow = {
  id: string;
  user_id: string;
  userEmail: string;
  status: string;
  subject: string;
  aspect_ratio: string | null;
  style: string | null;
  submitted_prompt: string | null;
  prompt_preview_zh: string | null;
  generated_image_path: string | null;
  imageUrl: string | null;
  created_at: string;
  deleted_at?: string | null;
  case_submission_status?: string | null;
  case_featured_at?: string | null;
  case_rewarded_at?: string | null;
};

export function summarizeAdminUsers({
  profiles,
  ledgers,
  payments,
  generations
}: {
  profiles: AdminProfileRow[];
  ledgers: AdminLedgerRow[];
  payments: AdminPaymentRow[];
  generations: AdminGenerationSummaryRow[];
}): AdminUserSummary[] {
  return profiles.map((profile) => {
    const userLedgers = ledgers.filter((entry) => entry.user_id === profile.user_id);
    const userPayments = payments.filter((payment) => payment.user_id === profile.user_id && payment.status === "paid");
    const userGenerations = generations.filter((generation) => generation.user_id === profile.user_id);

    return {
      userId: profile.user_id,
      email: profile.email || "No email",
      credits: profile.credit_balance,
      joinedAt: profile.created_at,
      paidCents: userPayments.reduce((sum, payment) => sum + payment.amount_cents, 0),
      purchasedCredits: userPayments.reduce((sum, payment) => sum + payment.credit_amount, 0),
      usedCredits: Math.abs(userLedgers
        .filter((entry) => entry.reason === "generation_debit")
        .reduce((sum, entry) => sum + entry.amount, 0)),
      rewardCredits: userLedgers
        .filter((entry) => isRewardReason(entry.reason))
        .reduce((sum, entry) => sum + Math.max(0, entry.amount), 0),
      generationCount: userGenerations.length
    };
  });
}

function isRewardReason(reason: string) {
  return [
    "referral_signup_bonus",
    "referral_payment_bonus",
    "admin_bonus",
    "case_reward"
  ].includes(reason);
}

export function yuanFromCents(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

type SupabaseLike = Pick<SupabaseClient, "from" | "storage">;

export async function getAdminDashboardData({
  admin = createSupabaseAdminClient(),
  selectedUserId
}: {
  admin?: SupabaseLike;
  selectedUserId?: string;
} = {}) {
  const [{ data: profiles }, { data: ledgers }, { data: payments }, { data: generationSummaries }] = await Promise.all([
    admin.from("profiles").select("user_id,email,credit_balance,created_at").order("created_at", { ascending: false }),
    admin.from("credit_ledger").select("user_id,amount,reason"),
    admin.from("payment_orders").select("user_id,amount_cents,credit_amount,status"),
    admin.from("generations").select("user_id,status")
  ]);

  const users = summarizeAdminUsers({
    profiles: (profiles ?? []) as AdminProfileRow[],
    ledgers: (ledgers ?? []) as AdminLedgerRow[],
    payments: (payments ?? []) as AdminPaymentRow[],
    generations: (generationSummaries ?? []) as AdminGenerationSummaryRow[]
  });

  const emailByUser = new Map(users.map((user) => [user.userId, user.email]));
  let query = admin
    .from("generations")
    .select("id,user_id,status,subject,aspect_ratio,style,submitted_prompt,prompt_preview_zh,generated_image_path,created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  if (selectedUserId) {
    query = query.eq("user_id", selectedUserId);
  }

  const { data: generations } = await query;
  const generationRows = await Promise.all(((generations ?? []) as Array<Omit<AdminGenerationRow, "userEmail" | "imageUrl">>).map(async (generation) => {
    let imageUrl: string | null = null;
    if (generation.generated_image_path) {
      const signed = await admin.storage.from("generated-images").createSignedUrl(generation.generated_image_path, 60 * 10);
      imageUrl = signed.data?.signedUrl ?? null;
    }

    return {
      ...generation,
      userEmail: emailByUser.get(generation.user_id) ?? "No email",
      imageUrl
    };
  }));

  return {
    users,
    generations: generationRows,
    selectedUserId: selectedUserId ?? ""
  };
}
