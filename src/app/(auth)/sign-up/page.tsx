"use client";

/**
 * Minimum-viable coach sign-up: just email + password. The handle_new_user
 * trigger creates the profile (role=coach via metadata), handle_coach_role
 * fills in a placeholder coaches row. Display name + business name are
 * editable later from /settings — keeping signup to two fields means coaches
 * are in the dashboard within seconds, not after a multi-field form.
 */

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // role=coach is the only metadata we need — handle_new_user reads it
        // to set profiles.role=coach, which fires handle_coach_role to
        // insert the coaches row with display_name='Coach' (placeholder
        // editable later from Settings).
        data: { role: "coach" },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (!data.user) {
      setError("Couldn't create account. Try again.");
      return;
    }

    if (data.session) {
      // Email confirmation is off → signed in. Hard nav so the cookie is
      // read by middleware on the next request.
      window.location.href = "/dashboard";
      return;
    }

    // Email confirmation is on → wait for verify.
    setEmailSent(true);
  }

  if (emailSent) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-2 pt-6 text-center">
          <h2 className="text-lg font-semibold">Check your inbox</h2>
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-mono">{email}</span>. Click it to finish
            setting up your coach account.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
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
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
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
              className="bg-input border-border text-base"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-input border-border text-base"
            />
            <p className="text-xs text-muted-foreground">
              You can fill in your name and business details later from Settings.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full bg-primary text-primary-foreground hover:bg-primary-dark"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Coach Account"}
          </Button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
