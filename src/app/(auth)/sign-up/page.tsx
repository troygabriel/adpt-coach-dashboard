"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

/**
 * The DB does the work: handle_new_user(auth.users) → creates profiles
 * with role from raw_user_meta_data. handle_coach_role(profiles) → creates
 * the coaches row when role='coach'. Both fire as SECURITY DEFINER triggers,
 * so we don't need (and can't) manually update those tables under the anon
 * key during signup — the user has no session yet when email confirmation
 * is on, and the manual writes race the triggers when it's off.
 */
export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
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
        // first_name + role get picked up by the handle_new_user trigger.
        // business_name lives only on `coaches`; we stash it in metadata
        // so a follow-up edit pass after sign-in can persist it cleanly.
        data: {
          first_name: displayName,
          role: "coach",
          business_name: businessName || null,
        },
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
      // Email confirmation is off → user is signed in immediately. Use a
      // hard navigation so the freshly-set auth cookie is read by the
      // middleware on the next request (router.push uses stale state).
      window.location.href = "/dashboard";
      return;
    }

    // Email confirmation is on → no session yet. Show "check inbox" UI;
    // the user will land on /api/auth/callback after clicking the email
    // link, which exchanges the code for a session.
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
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              Your Name
            </label>
            <Input
              id="displayName"
              type="text"
              placeholder="Coach Troy"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="businessName" className="text-sm font-medium text-foreground">
              Business Name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="businessName"
              type="text"
              placeholder="ADPT Coaching"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="bg-input border-border"
            />
          </div>
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
              className="bg-input border-border"
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
              className="bg-input border-border"
            />
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
