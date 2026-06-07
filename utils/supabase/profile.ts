import "server-only";
import { createClient } from "@/utils/supabase/server";

/** The signed-in user's profile (role, name, …) or null. Used by route guards and pages. */
export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, first_name, last_name, username, seller_color, is_active")
    .eq("id", user.id)
    .single();
  return data;
}
