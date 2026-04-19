"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  const [fullName, setFullName] = useState("");
  const [monthlyRate, setMonthlyRate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ tempPassword?: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    const rateCents = monthlyRate ? Math.round(parseFloat(monthlyRate) * 100) : null;

    const res = await fetch("/api/clients/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        full_name: fullName,
        monthly_rate_cents: rateCents,
        notes: notes || null,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    if (data.status === "created") {
      setResult({ tempPassword: data.temp_password });
    } else {
      resetAndClose();
      router.refresh();
    }

    setLoading(false);
  }

  function resetAndClose() {
    setEmail("");
    setFullName("");
    setMonthlyRate("");
    setNotes("");
    setError(null);
    setResult(null);
    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Client</DialogTitle>
        </DialogHeader>

        {result?.tempPassword ? (
          <div className="space-y-4 py-4">
            <p className="text-sm">
              Client account created. Share these credentials:
            </p>
            <div className="rounded-md bg-muted p-3 font-mono text-sm space-y-1">
              <p>Email: <strong>{email}</strong></p>
              <p>Password: <strong>{result.tempPassword}</strong></p>
            </div>
            <p className="text-xs text-muted-foreground">
              The client should change their password after first login.
            </p>
            <Button onClick={resetAndClose} className="w-full">Done</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Client Name</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Monthly Rate (USD) <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                type="number"
                placeholder="199"
                min="0"
                step="1"
                value={monthlyRate}
                onChange={(e) => setMonthlyRate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Notes <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Referred by John"
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={resetAndClose}>Cancel</Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Creating..." : "Add Client"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
