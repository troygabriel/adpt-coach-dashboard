"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const isDev = process.env.NODE_ENV === "development";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [devLoading, setDevLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      (typeof window !== "undefined" ? window.location.origin : "");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/reset-password`,
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setSent(true);
  }

  /**
   * Dev-only: skip the email round-trip entirely and ask the server to
   * mint a recovery link directly via the service role. Useful when
   * Supabase SMTP isn't configured locally or when the redirect URL
   * isn't whitelisted in the project's URL Configuration.
   */
  async function getDevLink() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setDevLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/dev-recovery-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Couldn't generate link");
        return;
      }
      setDevLink(json.link as string | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setDevLoading(false);
    }
  }

  if (sent) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-2 pt-6 text-center">
          <h2 className="text-lg font-semibold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We sent a password-reset link to{" "}
            <span className="font-mono">{email}</span>. The link expires in
            1 hour.
          </p>
        </CardContent>
        <CardFooter>
          <Link
            href="/sign-in"
            className="w-full text-center text-sm text-muted-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Forgot password</h2>
            <p className="text-sm text-muted-foreground">
              Enter your email and we&apos;ll send you a link to reset it.
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Dev-only: shown next to the form, not after submit, so we can
              use it whether or not the email path worked. */}
          {isDev && (
            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs">
              <p className="font-medium text-foreground">
                Dev mode — skip the email
              </p>
              <p className="mt-0.5 text-muted-foreground">
                Generates a one-time recovery link via the service role.
                Bypasses Supabase email and the URL allow-list.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 h-7"
                onClick={getDevLink}
                disabled={devLoading || !email}
              >
                {devLoading ? "Generating..." : "Get dev link"}
              </Button>
              {devLink && (
                <div className="mt-2 space-y-1">
                  <a
                    href={devLink}
                    className="block break-all text-foreground underline-offset-2 hover:underline"
                  >
                    {devLink}
                  </a>
                  <p className="text-muted-foreground">
                    Click it. You&apos;ll land on /reset-password signed in
                    via the recovery token.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? "Sending..." : "Send reset link"}
          </Button>
          <Link
            href="/sign-in"
            className="text-sm text-muted-foreground hover:underline"
          >
            Back to sign in
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
