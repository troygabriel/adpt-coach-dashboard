"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface AddClientDialogProps {
  open: boolean;
  onClose: () => void;
  coachId: string;
}

export function AddClientDialog({ open, onClose, coachId }: AddClientDialogProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClient();
    const rateCents = monthlyRate ? Math.round(parseFloat(monthlyRate) * 100) : null;

    // Try to find existing user by email
    const { data: userId } = await supabase.rpc("get_user_id_by_email", { p_email: email });

    if (userId) {
      // User exists — create direct coach-client relationship
      const { error: insertError } = await supabase.from("coach_clients").insert({
        coach_id: coachId,
        client_id: userId,
        status: "active",
        started_at: new Date().toISOString(),
        monthly_rate_cents: rateCents,
        notes: notes || null,
      });

      if (insertError) {
        if (insertError.code === "23505") {
          setError("This client is already on your roster.");
        } else {
          setError(insertError.message);
        }
        setLoading(false);
        return;
      }

      resetAndClose();
      router.refresh();
      return;
    }

    // User doesn't exist — create invitation
    const { error: inviteError } = await supabase.from("client_invitations").insert({
      coach_id: coachId,
      email,
    });

    if (inviteError) {
      setError(inviteError.message);
      setLoading(false);
      return;
    }

    setSuccess(`Invitation sent to ${email}. They'll appear on your roster once they sign up.`);
    setLoading(false);
  }

  function resetAndClose() {
    setEmail("");
    setMonthlyRate("");
    setNotes("");
    setError(null);
    setSuccess(null);
    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">{success}</p>
            <Button onClick={resetAndClose} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="clientEmail" className="text-sm font-medium">
                Client Email
              </label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="client@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                If they have an account, they'll be added directly. Otherwise, an invitation is created.
              </p>
            </div>
            <div className="space-y-2">
              <label htmlFor="rate" className="text-sm font-medium">
                Monthly Rate (USD) <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="rate"
                type="number"
                placeholder="199"
                min="0"
                step="1"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="notes"
                type="text"
                placeholder="e.g. Referred by John"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetAndClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
