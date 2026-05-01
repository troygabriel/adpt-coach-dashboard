"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const appUrl =
      typeof window !== "undefined" ? window.location.origin : "";
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

  if (sent) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-2 pt-6 text-center">
          <h2 className="text-lg font-semibold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We sent a password-reset link to <span className="font-mono">{email}</span>.
            The link expires in 1 hour.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/sign-in" className="w-full text-center text-sm text-muted-foreground hover:underline">
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
            <h2 className="text-lg font-semibold">Reset your password</h2>
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
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading || !email}>
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
