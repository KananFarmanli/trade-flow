import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/database.types";

/**
 * Browser-side Supabase client (Client Components).
 * Uses the publishable key — safe to ship to the browser. RLS enforces access.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
