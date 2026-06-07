"use server";

import { createClient } from "@/utils/supabase/server";
import type { ActionState } from "@/lib/actions";

export async function changePassword(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 6) return { error: "Şifrə ən azı 6 simvol olmalıdır." };
  if (password !== confirm) return { error: "Şifrələr uyğun gəlmir." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}
