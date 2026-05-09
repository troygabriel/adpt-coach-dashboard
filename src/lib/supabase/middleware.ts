import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must call getUser() not getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // All public auth-flow pages. Logged-out users must be able to reach
  // every one of these, otherwise the "Forgot?" / sign-up / recovery
  // flows bounce back to /sign-in in an infinite loop.
  const path = request.nextUrl.pathname;
  const isAuthPage =
    path.startsWith("/sign-in") ||
    path.startsWith("/sign-up") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/invite/") ||
    path.startsWith("/auth/callback");

  // API routes that must be reachable without a session. /api/invite/complete
  // is the find-or-create-user endpoint that handles the manual-share
  // onboarding path — it's literally for users who DON'T have a session
  // yet. Doing its own token validation, so safe to expose anon.
  const isPublicApi =
    path.startsWith("/api/auth") || path.startsWith("/api/invite/");

  // Unauthenticated users trying to access the dashboard
  if (!user && !isAuthPage && !isPublicApi && path !== "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    return NextResponse.redirect(url);
  }

  // Authenticated users on auth pages — bounce them to the dashboard
  // EXCEPT /invite/<token> and /auth/callback, which are completion flows
  // a logged-in user might land on (e.g. the coach testing a client invite,
  // or a recovery link). Otherwise they'd be redirected away mid-flow.
  const isCompletionFlow =
    path.startsWith("/invite/") || path.startsWith("/auth/callback");
  if (user && isAuthPage && !isCompletionFlow) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
