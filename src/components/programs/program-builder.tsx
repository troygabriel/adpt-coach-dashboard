"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Copy,
  MoreHorizontal,
  Moon,
  Pause,
  Play,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RowActions, type RowAction } from "@/components/patterns/row-actions";
import { WorkoutEditor } from "./workout-editor";
import {
  PHASE_GOALS,
  type PhaseGoal,
  phaseDisplayName,
  prettyGoal,
} from "@/lib/programs";
import { pluralize } from "@/lib/utils";

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rir?: number;
  rest_seconds?: number;
};

type PhaseWorkout = {
  id: string;
  day_number: number;
  name: string;
  exercises: Exercise[];
  duration_minutes: number | null;
  notes: string | null;
};

type Phase = {
  id: string;
  name: string;
  description: string | null;
  phase_number: number;
  duration_weeks: number;
  goal: string | null;
  status: string;
  phase_workouts: PhaseWorkout[];
};

type Program = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  client_id: string;
  profiles: { id: string; first_name: string | null } | null;
  program_phases: Phase[];
};

export function ProgramBuilder({ program }: { program: Program }) {
  const router = useRouter();
  const supabase = createClient();
  const [activePhaseId, setActivePhaseId] = useState<string | null>(
    program.program_phases?.[0]?.id ?? null
  );
  const [editingWorkout, setEditingWorkout] = useState<PhaseWorkout | null>(
    null
  );
  const [phaseDialogOpen, setPhaseDialogOpen] = useState(false);
  const [newPhaseGoal, setNewPhaseGoal] = useState<PhaseGoal>("hypertrophy");
  const [newPhaseWeeks, setNewPhaseWeeks] = useState("4");
  const [creatingPhase, setCreatingPhase] = useState(false);

  const phases = (program.program_phases ?? []).sort(
    (a, b) => a.phase_number - b.phase_number
  );

  const addPhase = useCallback(async () => {
    setCreatingPhase(true);
    const nextNum = phases.length + 1;
    const weeks = Math.max(1, parseInt(newPhaseWeeks, 10) || 4);
    const { data, error } = await supabase
      .from("program_phases")
      .insert({
        program_id: program.id,
        name: `Phase ${nextNum}`,
        phase_number: nextNum,
        duration_weeks: weeks,
        goal: newPhaseGoal,
        status: "upcoming",
      })
      .select("id")
      .single();
    setCreatingPhase(false);
    if (error || !data) {
      toast.error("Couldn't add phase", { description: error?.message });
      return;
    }
    setPhaseDialogOpen(false);
    setNewPhaseGoal("hypertrophy");
    setNewPhaseWeeks("4");
    setActivePhaseId(data.id);
    router.refresh();
  }, [phases.length, program.id, router, supabase, newPhaseGoal, newPhaseWeeks]);

  const addWorkout = useCallback(
    async (phaseId: string) => {
      const phase = phases.find((p) => p.id === phaseId);
      const existing = phase?.phase_workouts ?? [];
      const maxDay = existing.reduce((m, w) => Math.max(m, w.day_number), 0);
      const nextDay = maxDay + 1;
      const { data } = await supabase
        .from("phase_workouts")
        .insert({
          phase_id: phaseId,
          day_number: nextDay,
          name: `Day ${nextDay}`,
          exercises: [],
        })
        .select("*")
        .single();
      router.refresh();
      if (data) setEditingWorkout(data as PhaseWorkout);
    },
    [phases, router, supabase]
  );

  const insertRestDay = useCallback(
    async (phaseId: string, dayNumber: number) => {
      const { data, error } = await supabase
        .from("phase_workouts")
        .insert({
          phase_id: phaseId,
          day_number: dayNumber,
          name: `Day ${dayNumber}`,
          exercises: [],
        })
        .select("*")
        .single();
      if (error) {
        toast.error("Couldn't add day", { description: error.message });
        return;
      }
      router.refresh();
      if (data) setEditingWorkout(data as PhaseWorkout);
    },
    [router, supabase]
  );

  const deletePhase = useCallback(
    async (phase: Phase) => {
      const { error } = await supabase
        .from("program_phases")
        .delete()
        .eq("id", phase.id);
      if (error) {
        toast.error("Couldn't delete phase", { description: error.message });
        return;
      }
      if (activePhaseId === phase.id) {
        setActivePhaseId(phases.find((p) => p.id !== phase.id)?.id ?? null);
      }
      toast.success(`Deleted ${phaseDisplayName(phase)}`);
      router.refresh();
    },
    [activePhaseId, phases, router, supabase]
  );

  const duplicatePhase = useCallback(
    async (phase: Phase) => {
      const nextNum = phases.length + 1;
      const baseLabel = phaseDisplayName(phase);

      const { data: newPhase, error } = await supabase
        .from("program_phases")
        .insert({
          program_id: program.id,
          name: `Phase ${nextNum}`,
          description: phase.description,
          phase_number: nextNum,
          duration_weeks: phase.duration_weeks,
          goal: phase.goal,
          status: "upcoming",
        })
        .select("id")
        .single();

      if (error || !newPhase) {
        toast.error("Couldn't duplicate phase", { description: error?.message });
        return;
      }

      const workouts = phase.phase_workouts ?? [];
      if (workouts.length > 0) {
        const { error: wErr } = await supabase.from("phase_workouts").insert(
          workouts.map((w) => ({
            phase_id: newPhase.id,
            day_number: w.day_number,
            name: w.name,
            exercises: w.exercises ?? [],
            duration_minutes: w.duration_minutes,
            notes: w.notes,
          }))
        );
        if (wErr) {
          await supabase.from("program_phases").delete().eq("id", newPhase.id);
          toast.error("Couldn't duplicate phase workouts", {
            description: wErr.message,
          });
          return;
        }
      }

      router.refresh();
      setActivePhaseId(newPhase.id);
      toast.success(`Duplicated ${baseLabel}`);
    },
    [phases, program.id, router, supabase]
  );

  const duplicateWorkout = useCallback(
    async (workout: PhaseWorkout, phase: Phase) => {
      const existing = phase.phase_workouts ?? [];
      const maxDay = existing.reduce((m, w) => Math.max(m, w.day_number), 0);
      const nextDay = maxDay + 1;
      const defaultLabel = `Day ${workout.day_number}`;
      const isDefaultName =
        !workout.name || workout.name.trim() === defaultLabel;
      const newName = isDefaultName
        ? `Day ${nextDay}`
        : `${workout.name} (copy)`;

      const { error } = await supabase.from("phase_workouts").insert({
        phase_id: phase.id,
        day_number: nextDay,
        name: newName,
        exercises: workout.exercises ?? [],
        duration_minutes: workout.duration_minutes,
        notes: workout.notes,
      });

      if (error) {
        toast.error("Couldn't duplicate day", { description: error.message });
        return;
      }
      router.refresh();
      toast.success(`Duplicated ${defaultLabel}`);
    },
    [router, supabase]
  );

  const deleteWorkout = useCallback(
    async (workout: PhaseWorkout, phaseId: string) => {
      const { error } = await supabase
        .from("phase_workouts")
        .delete()
        .eq("id", workout.id);

      if (error) {
        toast.error("Couldn't delete day", { description: error.message });
        return;
      }

      router.refresh();

      const label = workout.name?.trim() || `Day ${workout.day_number}`;
      toast.success(`Deleted ${label}`, {
        action: {
          label: "Undo",
          onClick: async () => {
            const { error: insertError } = await supabase
              .from("phase_workouts")
              .insert({
                phase_id: phaseId,
                day_number: workout.day_number,
                name: workout.name,
                exercises: workout.exercises ?? [],
                duration_minutes: workout.duration_minutes,
                notes: workout.notes,
              });
            if (insertError) {
              toast.error("Couldn't restore day", {
                description: insertError.message,
              });
              return;
            }
            router.refresh();
            toast.success(`${label} restored`);
          },
        },
      });
    },
    [router, supabase]
  );

  const activateProgram = useCallback(async () => {
    await supabase.rpc("activate_program", { p_program_id: program.id });
    router.refresh();
  }, [program.id, router, supabase]);

  const pauseProgram = useCallback(async () => {
    await supabase
      .from("coaching_programs")
      .update({ status: "paused" })
      .eq("id", program.id);
    router.refresh();
  }, [program.id, router, supabase]);

  const phaseActions = (phase: Phase): RowAction[] => [
    {
      id: "duplicate",
      label: "Duplicate phase",
      icon: Copy,
      onSelect: () => duplicatePhase(phase),
    },
    {
      id: "delete",
      label: "Delete phase",
      icon: Trash2,
      destructive: true,
      onSelect: () => deletePhase(phase),
      confirm: {
        title: `Delete ${phaseDisplayName(phase)}?`,
        description: `This permanently removes the phase and all ${pluralize(
          phase.phase_workouts?.length ?? 0,
          "workout day"
        )} inside it. This can't be undone.`,
        actionLabel: "Delete phase",
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/programs")}
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span className="sr-only">Back to programs</span>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-2xl font-bold">{program.name}</h1>
            <Badge
              variant={program.status === "active" ? "default" : "secondary"}
            >
              {program.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            for{" "}
            <span className="font-medium text-foreground">
              {program.profiles?.first_name || "Unassigned"}
            </span>{" "}
            · {pluralize(phases.length, "phase")}
          </p>
        </div>
        {program.status === "draft" && (
          <Button onClick={activateProgram} disabled={phases.length === 0}>
            <Play aria-hidden="true" className="mr-2 h-4 w-4" /> Activate
          </Button>
        )}
        {program.status === "active" && (
          <Button variant="outline" onClick={pauseProgram}>
            <Pause aria-hidden="true" className="mr-2 h-4 w-4" /> Pause
          </Button>
        )}
      </div>

      {/* Phases */}
      {phases.length > 0 ? (
        <Tabs
          value={activePhaseId ?? undefined}
          onValueChange={setActivePhaseId}
        >
          <div className="flex items-center gap-2">
            <TabsList>
              {phases.map((phase) => (
                <TabsTrigger key={phase.id} value={phase.id}>
                  {phaseDisplayName(phase)}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setPhaseDialogOpen(true)}
              aria-label="Add phase"
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>

          {phases.map((phase) => {
            const sortedWorkouts = (phase.phase_workouts ?? [])
              .slice()
              .sort((a, b) => a.day_number - b.day_number);
            const maxDay = sortedWorkouts.reduce(
              (m, w) => Math.max(m, w.day_number),
              0
            );
            const dayMap = new Map(sortedWorkouts.map((w) => [w.day_number, w]));
            const days: Array<{ kind: "workout"; w: PhaseWorkout } | { kind: "rest"; n: number }> = [];
            for (let d = 1; d <= maxDay; d++) {
              const w = dayMap.get(d);
              if (w) days.push({ kind: "workout", w });
              else days.push({ kind: "rest", n: d });
            }

            return (
              <TabsContent key={phase.id} value={phase.id} className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {phase.duration_weeks} weeks
                    {phase.goal ? ` · ${prettyGoal(phase.goal)}` : ""}
                  </span>
                  <RowActions
                    actions={phaseActions(phase)}
                    ariaLabel="Phase options"
                  />
                </div>

                {days.map((d) => {
                  if (d.kind === "rest") {
                    return (
                      <RestDayCard
                        key={`rest-${d.n}`}
                        day={d.n}
                        onAdd={() => insertRestDay(phase.id, d.n)}
                      />
                    );
                  }
                  return (
                    <WorkoutDayCard
                      key={d.w.id}
                      workout={d.w}
                      onEdit={() => setEditingWorkout(d.w)}
                      onDuplicate={() => duplicateWorkout(d.w, phase)}
                      onDelete={() => deleteWorkout(d.w, phase.id)}
                    />
                  );
                })}

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => addWorkout(phase.id)}
                >
                  <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Add
                  workout day
                </Button>
              </TabsContent>
            );
          })}
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <p className="mb-4 text-muted-foreground">
            No phases yet. Add one to start building.
          </p>
          <Button onClick={() => setPhaseDialogOpen(true)}>
            <Plus aria-hidden="true" className="mr-2 h-4 w-4" /> Add phase
          </Button>
        </Card>
      )}

      {/* Add phase dialog */}
      <Dialog open={phaseDialogOpen} onOpenChange={setPhaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add phase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium">Goal</label>
              <Select
                value={newPhaseGoal}
                onValueChange={(v) => setNewPhaseGoal(v as PhaseGoal)}
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
                The phase will appear as &ldquo;Phase {phases.length + 1}:{" "}
                {prettyGoal(newPhaseGoal)}&rdquo;.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Duration</label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  value={newPhaseWeeks}
                  onChange={(e) => setNewPhaseWeeks(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">weeks</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setPhaseDialogOpen(false)}
              disabled={creatingPhase}
            >
              Cancel
            </Button>
            <Button onClick={addPhase} disabled={creatingPhase}>
              {creatingPhase ? "Adding…" : "Add phase"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingWorkout && (
        <WorkoutEditor
          open={!!editingWorkout}
          onClose={() => setEditingWorkout(null)}
          workoutId={editingWorkout.id}
          workoutName={editingWorkout.name}
          dayNumber={editingWorkout.day_number}
          initialExercises={editingWorkout.exercises || []}
        />
      )}
    </div>
  );
}

function WorkoutDayCard({
  workout,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  workout: PhaseWorkout;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const totalSets = (workout.exercises ?? []).reduce(
    (s, e) => s + (e.sets || 0),
    0
  );
  const dayLabel = `Day ${workout.day_number}`;
  const showCustomName = workout.name && workout.name.trim() !== dayLabel;

  return (
    <Card
      className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
      onClick={onEdit}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {dayLabel}
            </span>
            {showCustomName && (
              <span className="font-semibold">{workout.name}</span>
            )}
          </div>
          {workout.exercises?.length > 0 ? (
            <>
              <p className="truncate text-sm text-muted-foreground">
                {workout.exercises.map((e) => e.name).join(", ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {pluralize(workout.exercises.length, "exercise")} ·{" "}
                {pluralize(totalSets, "set")}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No exercises — tap to add
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
                <span className="sr-only">Day options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate();
                }}
              >
                <Copy aria-hidden="true" className="mr-2 h-4 w-4" />
                Duplicate day
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                <Trash2 aria-hidden="true" className="mr-2 h-4 w-4" />
                Delete day
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

function RestDayCard({ day, onAdd }: { day: number; onAdd: () => void }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-left transition-colors hover:bg-muted/60"
    >
      <div className="flex items-center gap-2">
        <Moon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Day {day}
        </span>
        <span className="text-sm text-muted-foreground">Rest</span>
      </div>
      <span className="text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
        Tap to add a workout
      </span>
    </button>
  );
}
