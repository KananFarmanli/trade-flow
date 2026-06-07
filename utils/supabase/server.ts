import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/utils/supabase/database.types";

/**
 * Server-side Supabase client (Server Components, Route Handlers, Server Actions).
 * `cookies()` is async in Next.js 16, so this factory is async.
 * Acts as the signed-in user — RLS applies. Do NOT use for privileged work
 * (admin user provisioning uses a separate service client, see utils/supabase/admin.ts in Step 3).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // `setAll` was called from a Server Component. Safe to ignore —
            // the session is refreshed by the proxy (utils/supabase/middleware.ts).
          }
        },
      },
    },
  );
}
