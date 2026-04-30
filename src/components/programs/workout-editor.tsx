"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExercisePicker } from "./exercise-picker";
import { GripVertical, Trash2, X } from "lucide-react";
import { pluralize } from "@/lib/utils";

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

  const updateExercise = useCallback(
    <K extends keyof Exercise>(idx: number, field: K, value: Exercise[K]) => {
      setExercises((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e))
      );
    },
    []
  );

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

    setSaving(false);

    if (error) {
      console.error("Save workout error:", error);
      toast.error("Couldn't save workout", { description: error.message });
      return;
    }

    toast.success("Workout saved");
    router.refresh();
    onClose();
  }, [name, exercises, workoutId, router, onClose]);

  const totalSets = exercises.reduce((sum, e) => sum + (e.sets || 0), 0);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:max-w-xl flex flex-col gap-0 p-0"
      >
        {/* Sticky header — single Day label, no duplicate */}
        <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Day {dayNumber}
              </p>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Workout name..."
                className="mt-0.5 h-auto border-0 p-0 text-base font-semibold shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <Button onClick={save} disabled={saving} size="sm">
                {saving ? "Saving..." : "Save"}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {pluralize(exercises.length, "exercise")} · {pluralize(totalSets, "set")}
          </p>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <ExercisePicker onSelect={addExercise} />

          {exercises.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
              <p className="text-sm font-medium text-foreground">No exercises yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Search above to add your first one.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {exercises.map((ex, idx) => (
                <li
                  key={`${idx}-${ex.name}`}
                  className="rounded-xl border border-border bg-card p-3.5"
                >
                  {/* Top row: handle + name + delete */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />
                      <span className="truncate text-sm font-medium">{ex.name}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeExercise(idx)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Bottom row: 4 labeled fields */}
                  <div className="mt-3 grid grid-cols-4 gap-2">
                    <Field label="Sets">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={1}
                        max={20}
                        value={ex.sets ?? ""}
                        onChange={(e) =>
                          updateExercise(idx, "sets", parseInt(e.target.value) || 0)
                        }
                        className="h-9 text-center text-sm"
                      />
                    </Field>
                    <Field label="Reps">
                      <Input
                        value={ex.reps ?? ""}
                        placeholder="8-12"
                        onChange={(e) => updateExercise(idx, "reps", e.target.value)}
                        className="h-9 text-center text-sm"
                      />
                    </Field>
                    <Field label="RIR">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={5}
                        value={ex.rir ?? ""}
                        onChange={(e) =>
                          updateExercise(idx, "rir", parseInt(e.target.value) || 0)
                        }
                        className="h-9 text-center text-sm"
                      />
                    </Field>
                    <Field label="Rest (s)">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        step={15}
                        value={ex.rest_seconds ?? ""}
                        onChange={(e) =>
                          updateExercise(
                            idx,
                            "rest_seconds",
                            parseInt(e.target.value) || 0
                          )
                        }
                        className="h-9 text-center text-sm"
                      />
                    </Field>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
