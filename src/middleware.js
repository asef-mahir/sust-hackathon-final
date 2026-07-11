import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

/**
 * src/middleware.js
 *
 * Refreshes the Supabase auth session on every request. Without this,
 * Server Components (AppShell/TopNav, getSessionOwner) can refresh an
 * expired access token in memory but can't persist the refreshed cookie
 * back to the browser — only Route Handlers, Server Actions, and
 * Middleware are allowed to set cookies. That silent-refresh-but-never-
 * persisted gap is what was causing every role to get logged out early,
 * well before actual session expiry.
 */
export async function middleware(request) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Triggers a token refresh (via the refresh token cookie) if the access
  // token has expired, and writes the refreshed cookies onto `response`.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
