import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Refreshes the Supabase session on every page request, so Server Components always see a
 * valid user. (Next.js 16 calls this file "proxy"; it was "middleware" before.)
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          // Responses that set auth cookies must never be cached and served to someone else
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Validates the token with the auth server and refreshes it when needed
  await supabase.auth.getUser();
  return response;
}

export const config = {
  // Skip static files, images and the Stripe webhook (it authenticates by signature, not cookies)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|api/stripe/webhook|api/cron).*)'],
};
