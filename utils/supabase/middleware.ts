import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Session-refresh helper invoked from the root `proxy.ts` (Next.js 16's renamed
 * middleware). Refreshes the auth token on every matched request and gates
 * unauthenticated traffic to /login.
 *
 * NOTE: route/role authorization is ALSO enforced in server layouts and server
 * actions (defense in depth) — a proxy matcher can silently skip server actions,
 * per the Next.js 16 proxy docs, so the proxy is not the only line of defense.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: do not run any code between createServerClient and getUser().
  // A missing call here can cause hard-to-debug random logouts.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/auth");

  // Unauthenticated visitor on a protected route → /login.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  // Already signed in but on /login → bounce to home; the role landing page redirects onward.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return copyCookies(supabaseResponse, NextResponse.redirect(url));
  }

  // IMPORTANT: return supabaseResponse so refreshed session cookies reach the browser.
  return supabaseResponse;
}

/** Preserve refreshed Supabase session cookies when returning a different response. */
function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
  return to;
}
