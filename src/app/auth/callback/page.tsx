"use client";

/**
 * Client-side auth callback for Supabase implicit-flow redirects.
 *
 * Why this page exists: Supabase's invite email (and password-recovery
 * emails when configured for legacy flow) redirect with the access token
 * in the URL **hash**, e.g.
 *   /auth/callback?next=/invite/<token>#access_token=...&refresh_token=...
 *
 * Hash fragments are NEVER sent to the server, so a server-only route
 * handler can't see them — the user lands signed-out and bounces back
 * to /sign-in. This page lets the browser-side Supabase client do its
 * default `detectSessionInUrl` thing on mount, then forwards to `next`.
 *
 * The PKCE branch (`?code=`) still lives at /api/auth/callback. Both can
 * coexist: OAuth providers and our own signUp flow use PKCE, while invite
 * + recovery emails generated server-side may use implicit. We accept
 * either by routing both arrival shapes here.
 *
 * Suspense wrapper: useSearchParams() forces the page out of static
 * pre-rendering. Next 16 requires the consumer to sit inside a Suspense
 * boundary or the build fails with "missing-suspense-with-csr-bailout".
 */

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackPlaceholder />}>
      <CallbackInner />
    </Suspense>
  );
}

function CallbackInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      // The Supabase browser client auto-processes window.location.hash on
      // construction (detectSessionInUrl: true is the default). Calling
      // getSession() here forces the promise to resolve once that work is
      // done — cleaner than a setTimeout.
      const { data, error } = await supabase.auth.getSession();
      if (cancelled) return;

      // PKCE branch: ?code= present, hash empty. Hand off to the route
      // handler that does the server-side code exchange.
      const code = params.get("code");
      if (!data.session && code) {
        const next = params.get("next") ?? "/dashboard";
        window.location.replace(
          `/api/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`,
        );
        return;
      }

      if (error) {
        setError(error.message);
        return;
      }

      // Implicit branch: detectSessionInUrl picked up the hash. Forward
      // to `next` (or /dashboard fallback). Use replace so the back button
      // doesn't return to this transient page.
      const next = params.get("next") ?? "/dashboard";
      router.replace(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [params, router]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-2 rounded-lg border border-border bg-card p-8 text-center">
          <h1 className="text-lg font-semibold">Couldn&apos;t sign you in</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">
            Try the email link again, or ask your coach to send a fresh
            invitation.
          </p>
        </div>
      </main>
    );
  }

  return <CallbackPlaceholder />;
}

function CallbackPlaceholder() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">Signing you in…</p>
    </main>
  );
}
