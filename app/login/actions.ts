"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { usernameToEmail, roleHome, type Role } from "@/lib/auth";

export type LoginState = { error: string } | null;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "İstifadəçi adı və şifrə tələb olunur." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: usernameToEmail(username),
    password,
  });
  if (error || !data.user) return { error: "İstifadəçi adı və ya şifrə yanlışdır." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", data.user.id)
    .single();

  if (!profile || !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "Hesab aktiv deyil və ya tapılmadı." };
  }

  redirect(roleHome(profile.role as Role));
}

export async function logout(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
