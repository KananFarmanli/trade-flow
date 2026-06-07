"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function openQuotaAction(input: { template_id: string; doctor_id: string; start_date: string }): Promise<{ error?: string; ok?: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessiya tapılmadı." };
  const { error } = await supabase.rpc("open_quota", {
    p_template: input.template_id,
    p_seller: user.id,
    p_doctor: input.doctor_id,
    p_start_date: input.start_date,
  });
  if (error) return { error: error.message };
  revalidatePath("/seller/quotas");
  revalidatePath("/director/quotas");
  return { ok: true };
}
