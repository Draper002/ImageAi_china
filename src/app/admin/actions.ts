"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { adminSessionCookieName, createAdminSessionToken, verifyAdminPassword, verifyAdminSessionToken } from "@/lib/admin-auth";
import { applyAdminCreditBonus, applyCaseReward } from "@/lib/credits";
import { normalizeCaseTags } from "@/lib/cases";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type GenerationForCase = {
  id: string;
  user_id: string;
  subject: string;
  image_type: string | null;
  aspect_ratio: string | null;
  style: string | null;
  prompt_preview_zh: string | null;
  prompt_preview_en: string | null;
  submitted_prompt: string;
  generated_image_path: string | null;
};

export async function isAdminAuthenticated() {
  const cookieStore = await cookies();
  return verifyAdminSessionToken(cookieStore.get(adminSessionCookieName)?.value);
}

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    redirect("/admin");
  }
}

export async function adminLogin(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (!verifyAdminPassword(password)) {
    redirect("/admin?error=invalid");
  }

  const cookieStore = await cookies();
  cookieStore.set(adminSessionCookieName, createAdminSessionToken(password.trim()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
    path: "/admin"
  });

  redirect("/admin");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(adminSessionCookieName);
  redirect("/admin");
}

export async function rewardUser(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  const amount = Number(formData.get("amount") ?? 0);
  const note = String(formData.get("note") ?? "").trim() || null;
  if (!userId || !Number.isFinite(amount) || amount <= 0) return;

  const admin = createSupabaseAdminClient();
  await applyAdminCreditBonus(admin, userId, Math.ceil(amount), note);
  revalidatePath("/admin");
}

export async function markGenerationAsCase(formData: FormData) {
  await requireAdmin();
  const generationId = String(formData.get("generationId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const tags = normalizeCaseTags(String(formData.get("tags") ?? ""));
  const rewardCredits = Number(formData.get("rewardCredits") ?? 0);
  if (!generationId) return;

  const admin = createSupabaseAdminClient();
  const { data: generation } = await admin
    .from("generations")
    .select("id,user_id,subject,image_type,aspect_ratio,style,prompt_preview_zh,prompt_preview_en,submitted_prompt,generated_image_path")
    .eq("id", generationId)
    .single<GenerationForCase>();

  if (!generation?.generated_image_path) return;

  const now = new Date().toISOString();
  await admin.from("case_examples").upsert({
    generation_id: generation.id,
    user_id: generation.user_id,
    title: title || generation.subject,
    subject: generation.subject,
    tags,
    image_type: generation.image_type,
    aspect_ratio: generation.aspect_ratio,
    style: generation.style,
    prompt_preview_zh: generation.prompt_preview_zh,
    prompt_preview_en: generation.prompt_preview_en,
    submitted_prompt: generation.submitted_prompt,
    generated_image_path: generation.generated_image_path,
    visibility: "public",
    featured_at: now,
    updated_at: now
  }, { onConflict: "generation_id" });

  await admin
    .from("generations")
    .update({
      case_submission_status: "approved",
      case_featured_at: now,
      updated_at: now
    })
    .eq("id", generation.id);

  if (Number.isFinite(rewardCredits) && rewardCredits > 0) {
    await applyCaseReward(admin, generation.id, Math.ceil(rewardCredits));
  }

  revalidatePath("/admin");
  revalidatePath("/examples");
}
