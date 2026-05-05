"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RowActions, type RowAction } from "@/components/patterns/row-actions";
import { PHASE_GOALS, type PhaseGoal, prettyGoal } from "@/lib/programs";
import { pluralize } from "@/lib/utils";

type Program = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  created_at: string;
  profiles: { id: string; first_name: string | null } | null;
  program_phases: {
    id: string;
    name: string;
    phase_number: number;
    status: string;
    duration_weeks: number;
    goal: string | null;
  }[];
};

type Client = {
  client_id: string;
  profiles: { id: string; first_name: string | null };
};

export function ProgramList({
  programs,
  clients,
  coachId,
}: {
  programs: Program[];
  clients: Client[];
  coachId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [goal, setGoal] = useState<PhaseGoal>("hypertrophy");
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const resetForm = () => {
    setName("");
    setClientId("");
    setGoal("hypertrophy");
  };

  const createProgram = async () => {
    if (!name || !clientId) return;
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("coaching_programs")
      .insert({ coach_id: coachId, client_id: clientId, name, status: "draft" })
      .select("id")
      .single();

    if (error || !data) {
      toast.error("Couldn't create program", { description: error?.message });
      setSaving(false);
      return;
    }

    const { error: phaseErr } = await supabase.from("program_phases").insert({
      program_id: data.id,
      name: "Phase 1",
      phase_number: 1,
      duration_weeks: 4,
      goal,
      status: "upcoming",
    });

    if (phaseErr) {
      toast.error("Couldn't create first phase", { description: phaseErr.message });
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    resetForm();
    router.push(`/programs/${data.id}`);
    setSaving(false);
  };

  const deleteProgram = async (program: Program) => {
    const supabase = createClient();
    const { error } = await supabase
      .from("coaching_programs")
      .delete()
      .eq("id", program.id);
    if (error) {
      toast.error("Couldn't delete program", { description: error.message });
      return;
    }
    toast.success(`Deleted ${program.name}`);
    router.refresh();
  };

  const statusVariant = (s: string) => {
    switch (s) {
      case "active":
        return "default" as const;
      case "draft":
        return "secondary" as const;
      case "completed":
        return "outline" as const;
      default:
        return "secondary" as const;
    }
  };

  const programActions = (program: Program): RowAction[] => [
    {
      id: "edit",
      label: "Edit",
      icon: Pencil,
      onSelect: () => router.push(`/programs/${program.id}`),
    },
    {
      id: "delete",
      label: "Delete",
      icon: Trash2,
      destructive: true,
      onSelect: () => deleteProgram(program),
      confirm: {
        title: `Delete ${program.name}?`,
        description: `This permanently removes the program and all its phases${
          program.program_phases?.length
            ? ` (${pluralize(program.program_phases.length, "phase")})`
            : ""
        }. This can't be undone.`,
        actionLabel: "Delete program",
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" />
            New program
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create program</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Hypertrophy Spring Block"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Client</label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select a client…" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.client_id} value={c.client_id}>
                      {c.profiles?.first_name || "Unknown"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">First phase goal</label>
              <Select
                value={goal}
                onValueChange={(v) => setGoal(v as PhaseGoal)}
              >
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASE_GOALS.map((g) => (
                    <SelectItem key={g.value} value={g.value}>
                      {g.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-xs text-muted-foreground">
                Used as the default label for Phase 1 — you can rename later.
              </p>
            </div>
            <Button
              onClick={createProgram}
              disabled={saving || !name || !clientId}
              className="w-full"
            >
              {saving ? "Creating…" : "Create program"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {programs.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No programs yet. Create one to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {programs.map((program) => {
            const firstPhaseGoal = program.program_phases?.[0]?.goal;
            return (
              <Card
                key={program.id}
                className="cursor-pointer p-4 transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/programs/${program.id}`)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {program.name}
                      </span>
                      <Badge variant={statusVariant(program.status)}>
                        {program.status}
                      </Badge>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">
                      {program.profiles?.first_name || "Unassigned"} ·{" "}
                      {pluralize(
                        program.program_phases?.length ?? 0,
                        "phase"
                      )}
                      {firstPhaseGoal ? ` · ${prettyGoal(firstPhaseGoal)}` : ""}
                    </p>
                  </div>
                  <RowActions
                    actions={programActions(program)}
                    ariaLabel="Program options"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
