"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";

function fields(fd: FormData) {
  return {
    first_name: String(fd.get("first_name") ?? "").trim(),
    last_name: String(fd.get("last_name") ?? "").trim(),
    phone: String(fd.get("phone") ?? "").trim() || null,
    instagram: String(fd.get("instagram") ?? "").trim() || null,
    clinic: String(fd.get("clinic") ?? "").trim() || null,
    comment: String(fd.get("comment") ?? "").trim() || null,
    assigned_seller_id: String(fd.get("assigned_seller_id") ?? "") || null,
  };
}

export async function createDoctor(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const f = fields(fd);
  if (!f.first_name || !f.last_name) return { error: "Ad və soyad tələb olunur." };
  if (!f.assigned_seller_id) return { error: "Satıcı təyin edin." };

  const supabase = await createClient();
  const { error } = await supabase.from("doctors").insert(f);
  if (error) return { error: "Həkim əlavə olunmadı." };
  revalidatePath("/director/doctors");
  return { ok: true };
}

export async function updateDoctor(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const id = String(fd.get("id") ?? "");
  const f = fields(fd);
  if (!id) return { error: "Həkim tapılmadı." };
  if (!f.first_name || !f.last_name) return { error: "Ad və soyad tələb olunur." };
  if (!f.assigned_seller_id) return { error: "Satıcı təyin edin." };

  const supabase = await createClient();
  const { error } = await supabase.from("doctors").update(f).eq("id", id);
  if (error) return { error: "Yenilənmədi." };
  revalidatePath("/director/doctors");
  revalidatePath(`/director/doctors/${id}`);
  return { ok: true };
}

export async function setDoctorActive(id: string, active: boolean): Promise<void> {
  const supabase = await createClient();
  await supabase.from("doctors").update({ is_active: active }).eq("id", id);
  revalidatePath("/director/doctors");
}
