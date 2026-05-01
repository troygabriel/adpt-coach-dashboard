"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";

interface InviteClientDialogProps {
  open: boolean;
  onClose: () => void;
}

type InviteResult = {
  status: "invited";
  invite_url: string;
  email_sent: boolean;
  email_error: string | null;
};

export function InviteClientDialog({ open, onClose }: InviteClientDialogProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail("");
    setFullName("");
    setResult(null);
    setLoading(false);
    setCopied(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/clients/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || null,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(data.error || "Couldn't send invite");
      return;
    }

    if (data.status === "linked") {
      toast.success("Client linked", { description: "They're on your roster." });
      router.refresh();
      reset();
      return;
    }

    setResult(data as InviteResult);
    router.refresh();
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result.invite_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{result ? "Invite sent" : "Invite client"}</DialogTitle>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {result.email_sent
                ? `We emailed ${email} a sign-up link. You can also share it directly:`
                : `Email failed to send. Share this link with ${email} directly:`}
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2">
              <span className="flex-1 truncate text-xs font-mono">{result.invite_url}</span>
              <Button size="sm" variant="ghost" onClick={handleCopy} className="h-7 w-7 p-0">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Expires in 7 days. Set rate and notes on the client&apos;s detail page after they accept.
            </p>
            <DialogFooter>
              <Button onClick={reset}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={reset}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !email}>
                {loading ? "Sending..." : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
