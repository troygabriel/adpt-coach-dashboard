"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Check, X, Mail } from "lucide-react";

type PendingInvite = {
  id: string;
  email: string;
  token: string;
  expires_at: string;
};

interface Props {
  invites: PendingInvite[];
  appUrl: string;
}

export function PendingInvitesList({ invites, appUrl }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (invites.length === 0) return null;

  async function handleCopy(invite: PendingInvite) {
    await navigator.clipboard.writeText(`${appUrl}/invite/${invite.token}`);
    setCopiedId(invite.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function handleCancel(invite: PendingInvite) {
    const { error } = await supabase
      .from("client_invitations")
      .update({ status: "expired" })
      .eq("id", invite.id);

    if (error) {
      toast.error("Couldn't cancel invite", { description: error.message });
      return;
    }

    toast.success("Invite cancelled");
    startTransition(() => router.refresh());
  }

  return (
    <Card className="space-y-3 p-4">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Pending invites ({invites.length})</h3>
      </div>
      <div className="space-y-2">
        {invites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{invite.email}</p>
              <p className="text-xs text-muted-foreground">
                Expires {new Date(invite.expires_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleCopy(invite)}
                title="Copy invite link"
              >
                {copiedId === invite.id ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => handleCancel(invite)}
                title="Cancel invite"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
