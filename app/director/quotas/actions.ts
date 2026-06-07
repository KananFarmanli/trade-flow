"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";

export async function createTemplate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const name = String(fd.get("name") ?? "").trim();
  const duration = Number(fd.get("duration_months") ?? 0);
  const total = Number(fd.get("total_goal") ?? 0);
  const dev = Number(fd.get("allowed_deviation_pct") ?? 0);
  if (!name) return { error: "Ad tələb olunur." };
  if (!duration || duration <= 0) return { error: "Müddət düzgün deyil." };
  if (total < 0) return { error: "Məbləğ mənfi ola bilməz." };
  if (dev < 0 || dev > 100) return { error: "Kənarlaşma 0–100% aralığında olmalıdır." };

  const monthly = Math.round((total / duration) * 100) / 100;
  const supabase = await createClient();
  const { error } = await supabase.from("quota_templates").insert({
    name,
    duration_months: duration,
    total_goal: total,
    monthly_goal: monthly,
    allowed_deviation_pct: dev,
  });
  if (error) return { error: "Şablon əlavə olunmadı." };
  revalidatePath("/director/quotas");
  return { ok: true };
}

export async function setTemplateActive(id: string, active: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("quota_templates").update({ is_active: active }).eq("id", id);
  revalidatePath("/director/quotas");
}

export async function closeQuotaAction(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.rpc("close_quota", { p_id: id });
  revalidatePath("/director/quotas");
  revalidatePath("/seller/quotas");
}
