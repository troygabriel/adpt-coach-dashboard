"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mail } from "lucide-react";

interface Props {
  email: string;
  token: string;
}

export function SignInLinkForm({ email, token }: Props) {
  const supabase = createClient();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setSending(true);
    const appUrl =
      typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/invite/${token}`,
      },
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send link", { description: error.message });
      return;
    }
    setSent(true);
  }

  return (
    <Card className="max-w-md space-y-4 p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Mail className="h-5 w-5" />
      </div>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Confirm your email</h1>
        <p className="text-sm text-muted-foreground">
          We&apos;ll send a sign-in link to <span className="font-mono">{email}</span> so you
          can finish setting up your account.
        </p>
      </div>
      {sent ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Check your inbox. The link will bring you back here.
        </div>
      ) : (
        <Button onClick={handleSend} disabled={sending} className="w-full">
          {sending ? "Sending..." : "Send sign-in link"}
        </Button>
      )}
    </Card>
  );
}
