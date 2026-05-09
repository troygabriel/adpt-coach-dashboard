"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronRight, Copy, Pencil, Plus, Trash2, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";

type Phase = {
  id: string;
  name: string;
  phase_number: number;
  status: string;
  duration_weeks: number;
  goal: string | null;
};

type Program = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  created_at: string;
  client_id: string;
  profiles: { id: string; first_name: string | null } | null;
  program_phases: Phase[];
};

type Client = {
  client_id: string;
  profiles: { id: string; first_name: string | null };
};

type TemplateGroup = {
  /** Normalized key used for grouping. */
  key: string;
  /** Display name (taken from the most-recent instance). */
  name: string;
  /** All program instances under this template, newest first. */
  instances: Program[];
};

function normalizeName(s: string): string {
  return s.trim().toLowerCase();
}

function groupByTemplate(programs: Program[]): TemplateGroup[] {
  const map = new Map<string, TemplateGroup>();
  for (const p of programs) {
    const key = normalizeName(p.name);
    const existing = map.get(key);
    if (existing) {
      existing.instances.push(p);
    } else {
      map.set(key, { key, name: p.name, instances: [p] });
    }
  }
  // Sort instances within each group by created_at desc.
  for (const g of map.values()) {
    g.instances.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }
  // Sort groups by most-recent activity.
  return Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.instances[0].created_at).getTime();
    const tb = new Date(b.instances[0].created_at).getTime();
    return tb - ta;
  });
}

function statusVariant(s: string) {
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
}

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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const groups = useMemo(() => groupByTemplate(programs), [programs]);

  const resetForm = () => {
    setName("");
    setClientId("");
    setGoal("hypertrophy");
  };

  const toggleExpanded = (key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
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
      toast.error("Couldn't create first phase", {
        description: phaseErr.message,
      });
      setSaving(false);
      return;
    }

    setDialogOpen(false);
    resetForm();
    router.push(`/programs/${data.id}`);
    setSaving(false);
  };

  /** Clone an existing program instance to a new client. Drives
   * "duplicate this template for another client" — the most common reason
   * coaches come to this page. */
  const cloneToClient = async (source: Program, newClientId: string) => {
    if (!newClientId) return;
    const supabase = createClient();
    const { data: prog, error: progErr } = await supabase
      .from("coaching_programs")
      .insert({
        coach_id: coachId,
        client_id: newClientId,
        name: source.name,
        description: source.description,
        status: "draft",
      })
      .select("id")
      .single();
    if (progErr || !prog) {
      toast.error("Couldn't duplicate program", { description: progErr?.message });
      return;
    }

    if (source.program_phases.length > 0) {
      const phaseRows = source.program_phases.map((ph) => ({
        program_id: prog.id,
        name: ph.name,
        phase_number: ph.phase_number,
        duration_weeks: ph.duration_weeks,
        goal: ph.goal,
        status: "upcoming",
      }));
      const { error: phaseErr } = await supabase
        .from("program_phases")
        .insert(phaseRows);
      if (phaseErr) {
        toast.error("Couldn't copy phases", { description: phaseErr.message });
        return;
      }
    }
    toast.success("Duplicated to new client");
    router.push(`/programs/${prog.id}`);
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
    toast.success(`Deleted ${program.name} (${program.profiles?.first_name ?? "client"})`);
    router.refresh();
  };

  const instanceActions = (program: Program): RowAction[] => [
    {
      id: "edit",
      label: "Open builder",
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
        description: `Remove this program from ${
          program.profiles?.first_name ?? "this client"
        }. This can't be undone.`,
        actionLabel: "Delete program",
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground">
            Each card is a program template. Expand to see which clients are
            running it. Per-client edits live on the client page.
          </p>
        </div>
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
                <label className="text-sm font-medium">Assign to client</label>
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
                <p className="mt-1 text-xs text-muted-foreground">
                  Programs always belong to a client. Use Duplicate later to
                  hand the same blueprint to another client.
                </p>
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
      </div>

      {groups.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            No programs yet. Create one to get started.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => {
            const isOpen = expanded.has(group.key);
            const totalPhases = group.instances.reduce(
              (acc, p) => acc + (p.program_phases?.length ?? 0),
              0,
            );
            const avgPhases = Math.round(
              totalPhases / Math.max(1, group.instances.length),
            );
            const goalLabel = prettyGoal(
              group.instances[0].program_phases?.[0]?.goal ?? null,
            );
            const activeCount = group.instances.filter(
              (p) => p.status === "active",
            ).length;
            return (
              <Card key={group.key} className="p-0">
                <button
                  type="button"
                  onClick={() => toggleExpanded(group.key)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-muted/40",
                  )}
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold">
                        {group.name}
                      </span>
                      {activeCount > 0 && (
                        <Badge variant="default" className="px-1.5 py-0 text-[10px]">
                          {activeCount} active
                        </Badge>
                      )}
                    </div>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Users aria-hidden="true" className="h-3 w-3" />
                        {pluralize(group.instances.length, "client")}
                      </span>
                      <span>·</span>
                      <span>
                        {avgPhases > 0
                          ? `~${pluralize(avgPhases, "phase")}`
                          : "no phases yet"}
                      </span>
                      {goalLabel && (
                        <>
                          <span>·</span>
                          <span>{goalLabel}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isOpen && "rotate-90",
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-muted/20">
                    <div className="divide-y divide-border">
                      {group.instances.map((instance) => (
                        <div
                          key={instance.id}
                          className="flex items-center justify-between gap-3 px-4 py-2.5"
                        >
                          <button
                            type="button"
                            onClick={() => router.push(`/programs/${instance.id}`)}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left"
                          >
                            <span className="truncate text-sm font-medium">
                              {instance.profiles?.first_name || "Unassigned"}
                            </span>
                            <Badge
                              variant={statusVariant(instance.status)}
                              className="px-1.5 py-0 text-[10px]"
                            >
                              {instance.status}
                            </Badge>
                            {instance.program_phases?.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {pluralize(
                                  instance.program_phases.length,
                                  "phase",
                                )}
                              </span>
                            )}
                          </button>
                          <RowActions
                            actions={instanceActions(instance)}
                            ariaLabel="Program options"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Duplicate this template to a different client. Only
                        shows clients who don't already have this template. */}
                    <DuplicateRow
                      group={group}
                      clients={clients}
                      onClone={(targetId) =>
                        cloneToClient(group.instances[0], targetId)
                      }
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DuplicateRow({
  group,
  clients,
  onClone,
}: {
  group: TemplateGroup;
  clients: Client[];
  onClone: (clientId: string) => void;
}) {
  const [target, setTarget] = useState("");
  const assignedIds = new Set(
    group.instances.map((i) => i.client_id ?? i.profiles?.id ?? ""),
  );
  const candidates = clients.filter((c) => !assignedIds.has(c.client_id));
  if (candidates.length === 0) return null;
  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-2.5">
      <Copy aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Duplicate to</span>
      <Select value={target} onValueChange={setTarget}>
        <SelectTrigger className="h-8 w-[180px]">
          <SelectValue placeholder="Pick client…" />
        </SelectTrigger>
        <SelectContent>
          {candidates.map((c) => (
            <SelectItem key={c.client_id} value={c.client_id}>
              {c.profiles?.first_name || "Unnamed"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={!target}
        onClick={() => {
          if (!target) return;
          onClone(target);
          setTarget("");
        }}
      >
        Duplicate
      </Button>
    </div>
  );
}
