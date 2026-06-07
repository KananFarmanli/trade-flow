import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/supabase/profile";
import type { Role } from "@/lib/auth";

/** Server-side route guard: ensure the signed-in user is active and has the required role. */
export async function requireRole(role: Role) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) redirect("/login");
  if (profile.role !== role) redirect("/");
  return profile;
}
