"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, ChevronRight } from "lucide-react";
import { pluralize } from "@/lib/utils";

type Program = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  created_at: string;
  profiles: { id: string; first_name: string | null } | null;
  program_phases: { id: string; name: string; phase_number: number; status: string; duration_weeks: number; goal: string | null }[];
};

type Client = {
  client_id: string;
  profiles: { id: string; first_name: string | null };
};

export function ProgramList({ programs, clients, coachId }: {
  programs: Program[];
  clients: Client[];
  coachId: string;
}) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const createProgram = async () => {
    if (!name || !clientId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("coaching_programs")
      .insert({ coach_id: coachId, client_id: clientId, name, status: "draft" })
      .select("id")
      .single();

    if (!error && data) {
      // Auto-create Phase 1
      await supabase.from("program_phases").insert({
        program_id: data.id,
        name: "Phase 1",
        phase_number: 1,
        duration_weeks: 4,
        goal: "hypertrophy",
        status: "upcoming",
      });

      setDialogOpen(false);
      setName("");
      setClientId("");
      router.push(`/programs/${data.id}`);
    }
    setSaving(false);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "active": return "default";
      case "draft": return "secondary";
      case "completed": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-4">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Program
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Program Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hypertrophy Block 1"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Assign to Client</label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a client...</option>
                {clients.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.profiles?.first_name || "Unknown"}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={createProgram} disabled={saving || !name || !clientId} className="w-full">
              {saving ? "Creating..." : "Create Program"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {programs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No programs yet. Create one to get started.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => (
            <Card
              key={program.id}
              className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => router.push(`/programs/${program.id}`)}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{program.name}</span>
                    <Badge variant={statusColor(program.status)}>{program.status}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {program.profiles?.first_name || "Unassigned"} · {pluralize(program.program_phases?.length ?? 0, "phase")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
