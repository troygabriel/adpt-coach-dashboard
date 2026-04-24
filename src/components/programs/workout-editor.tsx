"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ExercisePicker } from "./exercise-picker";
import { GripVertical, Trash2 } from "lucide-react";

type Exercise = {
  name: string;
  sets: number;
  reps: string;
  rir?: number;
  rest_seconds?: number;
  notes?: string;
};

type WorkoutEditorProps = {
  open: boolean;
  onClose: () => void;
  workoutId: string;
  workoutName: string;
  dayNumber: number;
  initialExercises: Exercise[];
};

export function WorkoutEditor({
  open,
  onClose,
  workoutId,
  workoutName,
  dayNumber,
  initialExercises,
}: WorkoutEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(workoutName);
  const [exercises, setExercises] = useState<Exercise[]>(initialExercises);
  const [saving, setSaving] = useState(false);

  // Sync state when props change (different workout opened)
  React.useEffect(() => {
    setName(workoutName);
    setExercises(initialExercises);
  }, [workoutId, workoutName, initialExercises]);

  const addExercise = useCallback((ex: { name: string }) => {
    setExercises((prev) => [
      ...prev,
      { name: ex.name, sets: 3, reps: "8-12", rir: 2, rest_seconds: 90 },
    ]);
  }, []);

  const updateExercise = useCallback((idx: number, field: keyof Exercise, value: any) => {
    setExercises((prev) =>
      prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
    );
  }, []);

  const removeExercise = useCallback((idx: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("phase_workouts")
      .update({ name, exercises })
      .eq("id", workoutId);

    if (error) {
      console.error("Save workout error:", error);
      alert("Failed to save: " + error.message);
    }

    setSaving(false);
    router.refresh();
    onClose();
  }, [name, exercises, workoutId, router, onClose]);

  const totalSets = exercises.reduce((sum, e) => sum + e.sets, 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-lg">Day {dayNumber}</SheetTitle>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 text-base font-semibold border-0 p-0 h-auto focus-visible:ring-0"
                placeholder="Workout name..."
              />
            </div>
            <Button onClick={save} disabled={saving} size="sm">
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {exercises.length} exercises · {totalSets} sets
          </p>
        </SheetHeader>

        {/* Exercise picker */}
        <div className="mb-4">
          <ExercisePicker onSelect={addExercise} />
        </div>

        {/* Exercise list */}
        <div className="space-y-2">
          {exercises.map((ex, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-lg border p-3"
            >
              <GripVertical className="mt-1 h-4 w-4 shrink-0 text-muted-foreground cursor-grab" />

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{ex.name}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeExercise(idx)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      value={ex.sets}
                      onChange={(e) => updateExercise(idx, "sets", parseInt(e.target.value) || 0)}
                      className="h-7 w-12 text-center text-xs"
                    />
                    <span className="text-xs text-muted-foreground">sets</span>
                  </div>
                  <span className="text-muted-foreground">×</span>
                  <div className="flex items-center gap-1">
                    <Input
                      value={ex.reps}
                      onChange={(e) => updateExercise(idx, "reps", e.target.value)}
                      className="h-7 w-16 text-center text-xs"
                    />
                    <span className="text-xs text-muted-foreground">reps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground">RIR</span>
                    <Input
                      type="number"
                      value={ex.rir ?? 2}
                      onChange={(e) => updateExercise(idx, "rir", parseInt(e.target.value) || 0)}
                      className="h-7 w-12 text-center text-xs"
                      min={0}
                      max={5}
                    />
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Input
                      type="number"
                      value={ex.rest_seconds ?? 90}
                      onChange={(e) => updateExercise(idx, "rest_seconds", parseInt(e.target.value) || 60)}
                      className="h-7 w-14 text-center text-xs"
                    />
                    <span className="text-xs text-muted-foreground">s rest</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {exercises.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Search and add exercises above
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
