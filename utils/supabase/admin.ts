import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/utils/supabase/database.types";

/**
 * Service-role Supabase client. BYPASSES RLS — server-only, never import from a
 * Client Component. Used solely for privileged admin work: provisioning users
 * (auth.admin.createUser) and writing their profile row. The `server-only` import
 * makes the build fail if this is ever pulled into client code.
 */
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
