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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();

    // Find user by email
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", (
        await supabase.rpc("get_user_id_by_email", { p_email: email })
      ).data)
      .single();

    // If user lookup fails, try a direct approach
    // For now, create a pending relationship with the email as a note
    const rateCents = monthlyRate ? Math.round(parseFloat(monthlyRate) * 100) : null;

    const { error: insertError } = await supabase.from("coach_clients").insert({
      coach_id: coachId,
      client_id: profiles?.id || null,
      status: "pending",
      monthly_rate_cents: rateCents,
      notes: notes || `Invited: ${email}`,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setEmail("");
    setMonthlyRate("");
    setNotes("");
    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">Add Client</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="clientEmail" className="text-sm font-medium text-foreground">
              Client Email
            </label>
            <Input
              id="clientEmail"
              type="email"
              placeholder="client@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="rate" className="text-sm font-medium text-foreground">
              Monthly Rate (USD){" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="rate"
              type="number"
              placeholder="199"
              min="0"
              step="1"
              value={monthlyRate}
              onChange={(e) => setMonthlyRate(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium text-foreground">
              Notes{" "}
              <span className="text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="notes"
              type="text"
              placeholder="e.g. Referred by John"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-input border-border"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="text-muted-foreground"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primary text-primary-foreground hover:bg-primary-dark"
              disabled={loading}
            >
              {loading ? "Adding..." : "Add Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
