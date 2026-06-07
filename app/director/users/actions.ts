"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { usernameToEmail } from "@/lib/auth";

/** Confirm the caller is an active director before any privileged admin work. */
async function assertDirector(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase.from("profiles").select("role, is_active").eq("id", user.id).single();
  return data?.role === "director" && data.is_active === true;
}

export type CreateUserState = { error?: string; ok?: boolean } | null;

export async function createUser(_prev: CreateUserState, formData: FormData): Promise<CreateUserState> {
  if (!(await assertDirector())) return { error: "İcazə yoxdur." };

  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const role = String(formData.get("role") ?? "");
  const seller_color = String(formData.get("seller_color") ?? "").trim() || null;

  if (!username || !password || !first_name || !last_name) return { error: "Bütün xanaları doldurun." };
  if (!/^[a-z0-9._-]{3,}$/.test(username)) return { error: "İstifadəçi adı ən azı 3 simvol (a-z, 0-9, . _ -) olmalıdır." };
  if (password.length < 6) return { error: "Şifrə ən azı 6 simvol olmalıdır." };
  if (role !== "manager" && role !== "seller") return { error: "Rol seçin." };

  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id").ilike("username", username).maybeSingle();
  if (existing) return { error: "Bu istifadəçi adı artıq mövcuddur." };

  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password,
    email_confirm: true,
    app_metadata: { user_role: role },
  });
  if (cErr || !created.user) return { error: "İstifadəçi yaradıla bilmədi." };

  const { error: pErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: role as "manager" | "seller",
    first_name,
    last_name,
    username,
    seller_color: role === "seller" ? seller_color : null,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(created.user.id); // don't strand an auth user without a profile
    return { error: "Profil yaradıla bilmədi." };
  }

  revalidatePath("/director/users");
  return { ok: true };
}

/** Activate / deactivate a user. Deactivation also bans the auth user so existing sessions die immediately. */
export async function setUserActive(userId: string, active: boolean): Promise<void> {
  if (!(await assertDirector())) return;
  const admin = createAdminClient();
  await admin.from("profiles").update({ is_active: active }).eq("id", userId);
  await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/director/users");
}
