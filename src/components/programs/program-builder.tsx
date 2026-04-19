"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Trash2, GripVertical, Play, Pause } from "lucide-react";

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rir?: number;
  rest_seconds?: number;
  notes?: string;
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

  const phases = (program.program_phases ?? []).sort((a, b) => a.phase_number - b.phase_number);
  const activePhase = phases.find((p) => p.id === activePhaseId);

  const addPhase = useCallback(async () => {
    const nextNum = phases.length + 1;
    const { data, error } = await supabase
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

    if (!error && data) {
      router.refresh();
      setActivePhaseId(data.id);
    }
  }, [phases.length, program.id, router, supabase]);

  const addWorkout = useCallback(async (phaseId: string) => {
    const phase = phases.find((p) => p.id === phaseId);
    const nextDay = (phase?.phase_workouts?.length ?? 0) + 1;

    await supabase.from("phase_workouts").insert({
      phase_id: phaseId,
      day_number: nextDay,
      name: `Day ${nextDay}`,
      exercises: [],
    });

    router.refresh();
  }, [phases, router, supabase]);

  const deletePhase = useCallback(async (phaseId: string) => {
    await supabase.from("program_phases").delete().eq("id", phaseId);
    if (activePhaseId === phaseId) {
      setActivePhaseId(phases.find((p) => p.id !== phaseId)?.id ?? null);
    }
    router.refresh();
  }, [activePhaseId, phases, router, supabase]);

  const activateProgram = useCallback(async () => {
    await supabase
      .from("coaching_programs")
      .update({ status: "active" })
      .eq("id", program.id);

    if (phases[0]) {
      await supabase
        .from("program_phases")
        .update({ status: "active" })
        .eq("id", phases[0].id);
    }

    router.refresh();
  }, [program.id, phases, router, supabase]);

  const pauseProgram = useCallback(async () => {
    await supabase
      .from("coaching_programs")
      .update({ status: "paused" })
      .eq("id", program.id);
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
            {program.profiles?.first_name || "Unassigned"} · {phases.length} phases
          </p>
        </div>
        <div className="flex gap-2">
          {program.status === "draft" && (
            <Button onClick={activateProgram} disabled={phases.length === 0}>
              <Play className="mr-2 h-4 w-4" />
              Activate
            </Button>
          )}
          {program.status === "active" && (
            <Button variant="outline" onClick={pauseProgram}>
              <Pause className="mr-2 h-4 w-4" />
              Pause
            </Button>
          )}
        </div>
      </div>

      {/* Phase tabs */}
      {phases.length > 0 ? (
        <Tabs value={activePhaseId ?? undefined} onValueChange={setActivePhaseId}>
          <div className="flex items-center gap-2">
            <TabsList>
              {phases.map((phase) => (
                <TabsTrigger key={phase.id} value={phase.id}>
                  {phase.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="ghost" size="icon" onClick={addPhase}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {phases.map((phase) => (
            <TabsContent key={phase.id} value={phase.id} className="space-y-4">
              <PhaseDetail
                phase={phase}
                onAddWorkout={() => addWorkout(phase.id)}
                onDeletePhase={() => deletePhase(phase.id)}
                onRefresh={() => router.refresh()}
              />
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No phases yet. Add one to start building.</p>
          <Button onClick={addPhase}>
            <Plus className="mr-2 h-4 w-4" />
            Add Phase
          </Button>
        </Card>
      )}
    </div>
  );
}

function PhaseDetail({ phase, onAddWorkout, onDeletePhase, onRefresh }: {
  phase: Phase;
  onAddWorkout: () => void;
  onDeletePhase: () => void;
  onRefresh: () => void;
}) {
  const supabase = createClient();
  const workouts = (phase.phase_workouts ?? []).sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="space-y-4">
      {/* Phase info */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {phase.duration_weeks} weeks · {phase.goal || "General"} · {workouts.length} workouts
        </div>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={onDeletePhase}>
          <Trash2 className="mr-1 h-3 w-3" />
          Delete Phase
        </Button>
      </div>

      {/* Workouts */}
      {workouts.map((workout) => (
        <WorkoutCard key={workout.id} workout={workout} onRefresh={onRefresh} />
      ))}

      <Button variant="outline" onClick={onAddWorkout} className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Workout Day
      </Button>
    </div>
  );
}

function WorkoutCard({ workout, onRefresh }: { workout: PhaseWorkout; onRefresh: () => void }) {
  const supabase = createClient();
  const [editing, setEditing] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>(workout.exercises || []);
  const [workoutName, setWorkoutName] = useState(workout.name);
  const [newExName, setNewExName] = useState("");
  const [newExSets, setNewExSets] = useState("3");
  const [newExReps, setNewExReps] = useState("8-12");

  const addExercise = () => {
    if (!newExName) return;
    setExercises([...exercises, {
      name: newExName,
      sets: parseInt(newExSets) || 3,
      reps: newExReps || "8-12",
      rir: 2,
    }]);
    setNewExName("");
  };

  const removeExercise = (idx: number) => {
    setExercises(exercises.filter((_, i) => i !== idx));
  };

  const saveWorkout = async () => {
    await supabase
      .from("phase_workouts")
      .update({ name: workoutName, exercises })
      .eq("id", workout.id);
    setEditing(false);
    onRefresh();
  };

  const deleteWorkout = async () => {
    await supabase.from("phase_workouts").delete().eq("id", workout.id);
    onRefresh();
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Day {workout.day_number}</span>
          {editing ? (
            <Input
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="h-8 w-48"
            />
          ) : (
            <span className="font-semibold">{workout.name}</span>
          )}
        </div>
        <div className="flex gap-1">
          {editing ? (
            <>
              <Button size="sm" onClick={saveWorkout}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setExercises(workout.exercises || []); }}>Cancel</Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={deleteWorkout}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Exercise list */}
      <div className="space-y-1">
        {exercises.map((ex, i) => (
          <div key={i} className="flex items-center gap-3 py-1.5 text-sm">
            <GripVertical className="h-3 w-3 text-muted-foreground" />
            <span className="flex-1">{ex.name}</span>
            <span className="text-muted-foreground">{ex.sets} × {ex.reps}</span>
            {ex.rir != null && (
              <Badge variant="outline" className="text-xs">RIR {ex.rir}</Badge>
            )}
            {editing && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => removeExercise(i)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {exercises.length === 0 && !editing && (
        <p className="text-sm text-muted-foreground py-2">No exercises. Click Edit to add.</p>
      )}

      {/* Add exercise (edit mode) */}
      {editing && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
          <Input
            value={newExName}
            onChange={(e) => setNewExName(e.target.value)}
            placeholder="Exercise name"
            className="h-8 flex-1"
            onKeyDown={(e) => e.key === "Enter" && addExercise()}
          />
          <Input
            value={newExSets}
            onChange={(e) => setNewExSets(e.target.value)}
            placeholder="Sets"
            className="h-8 w-16 text-center"
          />
          <Input
            value={newExReps}
            onChange={(e) => setNewExReps(e.target.value)}
            placeholder="Reps"
            className="h-8 w-20 text-center"
          />
          <Button size="sm" variant="outline" onClick={addExercise}>Add</Button>
        </div>
      )}
    </Card>
  );
}
