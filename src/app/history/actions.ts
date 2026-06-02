"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function deleteGeneration(formData: FormData) {
  const generationId = String(formData.get("generationId") ?? "");
  if (!generationId) return;

  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  await admin
    .from("generations")
    .update({
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", generationId)
    .eq("user_id", user.id);

  revalidatePath("/history");
}

export async function submitGenerationCase(formData: FormData) {
  const generationId = String(formData.get("generationId") ?? "");
  if (!generationId) return;

  const user = await requireUser();
  const admin = createSupabaseAdminClient();
  await admin
    .from("generations")
    .update({
      case_submission_status: "submitted",
      case_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("id", generationId)
    .eq("user_id", user.id)
    .eq("status", "succeeded")
    .not("generated_image_path", "is", null);

  revalidatePath("/history");
}
