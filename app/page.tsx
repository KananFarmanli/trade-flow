import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/utils/supabase/profile";
import { roleHome, type Role } from "@/lib/auth";

// Landing route: send each signed-in user to their role dashboard.
export default async function Home() {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) redirect("/login");
  redirect(roleHome(profile.role as Role));
}
