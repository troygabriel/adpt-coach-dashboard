"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          role: "coach",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account");
      setLoading(false);
      return;
    }

    // 2. Set profile role to coach
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role: "coach", first_name: displayName })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("Profile update error:", profileError);
    }

    // 3. Create coach row
    const { error: coachError } = await supabase.from("coaches").insert({
      id: authData.user.id,
      display_name: displayName,
      business_name: businessName || null,
      is_accepting_clients: true,
    });

    if (coachError) {
      console.error("Coach creation error:", coachError);
      setError("Account created but coach profile setup failed. Please contact support.");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
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
