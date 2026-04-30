"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WorkoutEditor } from "./workout-editor";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Play,
  Pause,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react";
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
  const [editingWorkout, setEditingWorkout] = useState<PhaseWorkout | null>(null);

  const phases = (program.program_phases ?? []).sort((a, b) => a.phase_number - b.phase_number);
  const activePhase = phases.find((p) => p.id === activePhaseId);

  const addPhase = useCallback(async () => {
    const nextNum = phases.length + 1;
    const { data } = await supabase
      .from("program_phases")
      .insert({
        program_id: program.id,
        name: `Phase ${nextNum}`,
        phase_number: nextNum,
        duration_weeks: 4,
        goal: "hypertrophy",
        status: "upcoming",
      })
      .select("id")
      .single();
    if (data) {
      router.refresh();
      setActivePhaseId(data.id);
    }
  }, [phases.length, program.id, router, supabase]);

  const addWorkout = useCallback(async (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    const nextDay = (phase?.phase_workouts?.length ?? 0) + 1;
    const { data } = await supabase
      .from("phase_workouts")
      .insert({ phase_id: phaseId, day_number: nextDay, name: `Day ${nextDay}`, exercises: [] })
      .select("*")
      .single();
    router.refresh();
    if (data) setEditingWorkout(data as PhaseWorkout);
  }, [phases, router, supabase]);

  const deletePhase = useCallback(async (phaseId: string) => {
    await supabase.from("program_phases").delete().eq("id", phaseId);
    if (activePhaseId === phaseId) setActivePhaseId(phases.find((p) => p.id !== phaseId)?.id ?? null);
    router.refresh();
  }, [activePhaseId, phases, router, supabase]);

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
            const { error: insertError } = await supabase.from("phase_workouts").insert({
              phase_id: phaseId,
              day_number: workout.day_number,
              name: workout.name,
              exercises: workout.exercises ?? [],
              duration_minutes: workout.duration_minutes,
              notes: workout.notes,
            });
            if (insertError) {
              toast.error("Couldn't restore day", { description: insertError.message });
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
    await supabase.from("coaching_programs").update({ status: "paused" }).eq("id", program.id);
    router.refresh();
  }, [program.id, router, supabase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/programs")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{program.name}</h1>
            <Badge variant={program.status === "active" ? "default" : "secondary"}>
              {program.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {program.profiles?.first_name || "Unassigned"} · {pluralize(phases.length, "phase")}
          </p>
        </div>
        {program.status === "draft" && (
          <Button onClick={activateProgram} disabled={phases.length === 0}>
            <Play className="mr-2 h-4 w-4" /> Activate
          </Button>
        )}
        {program.status === "active" && (
          <Button variant="outline" onClick={pauseProgram}>
            <Pause className="mr-2 h-4 w-4" /> Pause
          </Button>
        )}
      </div>

      {/* Phases */}
      {phases.length > 0 ? (
        <Tabs value={activePhaseId ?? undefined} onValueChange={setActivePhaseId}>
          <div className="flex items-center gap-2">
            <TabsList>
              {phases.map((phase) => (
                <TabsTrigger key={phase.id} value={phase.id}>{phase.name}</TabsTrigger>
              ))}
            </TabsList>
            <Button variant="ghost" size="icon" onClick={addPhase}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {phases.map((phase) => (
            <TabsContent key={phase.id} value={phase.id} className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{phase.duration_weeks} weeks · {phase.goal || "General"}</span>
                <Button variant="ghost" size="sm" className="text-destructive h-7" onClick={() => deletePhase(phase.id)}>
                  <Trash2 className="mr-1 h-3 w-3" /> Delete
                </Button>
              </div>

              {/* Workout cards */}
              {(phase.phase_workouts ?? [])
                .sort((a, b) => a.day_number - b.day_number)
                .map((workout) => {
                  const totalSets = (workout.exercises ?? []).reduce((s, e) => s + (e.sets || 0), 0);
                  const dayLabel = `Day ${workout.day_number}`;
                  const showCustomName = workout.name && workout.name.trim() !== dayLabel;
                  return (
                    <Card
                      key={workout.id}
                      className="p-4 cursor-pointer hover:bg-muted/40 transition-colors"
                      onClick={() => setEditingWorkout(workout)}
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
                                {pluralize(workout.exercises.length, "exercise")} · {pluralize(totalSets, "set")}
                              </p>
                            </>
                          ) : (
                            <p className="text-sm text-muted-foreground">No exercises — tap to add</p>
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
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Day options</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                className="cursor-pointer text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteWorkout(workout, phase.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete day
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  );
                })}

              <Button variant="outline" className="w-full" onClick={() => addWorkout(phase.id)}>
                <Plus className="mr-2 h-4 w-4" /> Add Workout Day
              </Button>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No phases yet. Add one to start building.</p>
          <Button onClick={addPhase}>
            <Plus className="mr-2 h-4 w-4" /> Add Phase
          </Button>
        </Card>
      )}

      {/* Workout editor sheet */}
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
