"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Moon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { phaseDisplayName, prettyGoal } from "@/lib/programs";
import { cn, pluralize } from "@/lib/utils";

type Exercise = { name: string; sets: number; reps: string };

type Workout = {
  id: string;
  dayNumber: number;
  name: string;
  exercises: Exercise[];
};

type Phase = {
  id: string;
  name: string;
  phaseNumber: number;
  durationWeeks: number;
  goal: string | null;
  status: string;
  workouts: Workout[];
};

export function ProgramSummary({
  programName,
  phases,
}: {
  programId: string;
  programName: string;
  phases: Phase[];
}) {
  const [openPhaseIds, setOpenPhaseIds] = useState<Set<string>>(() => {
    // Default: expand the active phase, collapse others.
    const active = phases.find((p) => p.status === "active");
    return new Set(active ? [active.id] : phases.length > 0 ? [phases[0].id] : []);
  });
  const [openWorkoutIds, setOpenWorkoutIds] = useState<Set<string>>(new Set());

  const togglePhase = (id: string) => {
    setOpenPhaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleWorkout = (id: string) => {
    setOpenWorkoutIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (phases.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm font-medium">{programName}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          No phases yet. Open in the builder to add one.
        </p>
      </Card>
    );
  }

  const sortedPhases = [...phases].sort(
    (a, b) => a.phaseNumber - b.phaseNumber
  );

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card px-5 py-4">
        <p className="text-base font-semibold tracking-tight">{programName}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {pluralize(phases.length, "phase")} · {sortedPhases
            .reduce((s, p) => s + p.workouts.length, 0)}{" "}
          training days total
        </p>
      </div>

      {sortedPhases.map((phase) => {
        const isOpen = openPhaseIds.has(phase.id);
        const workouts = phase.workouts
          .slice()
          .sort((a, b) => a.dayNumber - b.dayNumber);
        const maxDay = workouts.reduce(
          (m, w) => Math.max(m, w.dayNumber),
          0
        );
        const dayMap = new Map(workouts.map((w) => [w.dayNumber, w]));
        const days: Array<
          { kind: "workout"; w: Workout } | { kind: "rest"; n: number }
        > = [];
        for (let d = 1; d <= maxDay; d++) {
          const w = dayMap.get(d);
          if (w) days.push({ kind: "workout", w });
          else days.push({ kind: "rest", n: d });
        }

        return (
          <div
            key={phase.id}
            className="overflow-hidden rounded-xl border border-border bg-card"
          >
            <button
              type="button"
              onClick={() => togglePhase(phase.id)}
              className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {phaseDisplayName({
                    name: phase.name,
                    phase_number: phase.phaseNumber,
                    goal: phase.goal,
                  })}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {phase.durationWeeks} weeks
                  {phase.goal ? ` · ${prettyGoal(phase.goal)}` : ""} ·{" "}
                  {pluralize(phase.workouts.length, "training day")}
                </p>
              </div>
              {phase.status === "active" && (
                <span className="rounded-md bg-foreground px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-background">
                  Active
                </span>
              )}
              {isOpen ? (
                <ChevronDown
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
              ) : (
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
              )}
            </button>

            {isOpen && days.length > 0 && (
              <ul className="divide-y divide-border border-t border-border">
                {days.map((d) => {
                  if (d.kind === "rest") {
                    return (
                      <li
                        key={`rest-${phase.id}-${d.n}`}
                        className="flex items-center gap-3 px-5 py-3 text-sm text-muted-foreground"
                      >
                        <Moon
                          aria-hidden="true"
                          className="h-4 w-4 shrink-0"
                        />
                        <span className="text-[11px] font-medium uppercase tracking-wide">
                          Day {d.n}
                        </span>
                        <span>Rest</span>
                      </li>
                    );
                  }
                  const w = d.w;
                  const wOpen = openWorkoutIds.has(w.id);
                  const dayLabel = `Day ${w.dayNumber}`;
                  const isCustomName =
                    w.name && w.name.trim() !== dayLabel;
                  const totalSets = w.exercises.reduce(
                    (s, e) => s + (e.sets || 0),
                    0
                  );
                  return (
                    <li key={w.id}>
                      <button
                        type="button"
                        onClick={() => toggleWorkout(w.id)}
                        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-muted/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {dayLabel}
                            </span>
                            {isCustomName && (
                              <span className="text-sm font-medium">
                                {w.name}
                              </span>
                            )}
                          </div>
                          {w.exercises.length === 0 ? (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              No exercises yet
                            </p>
                          ) : (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {pluralize(w.exercises.length, "exercise")} ·{" "}
                              {pluralize(totalSets, "set")}
                            </p>
                          )}
                        </div>
                        {wOpen ? (
                          <ChevronDown
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                          />
                        ) : (
                          <ChevronRight
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                          />
                        )}
                      </button>
                      {wOpen && w.exercises.length > 0 && (
                        <ul className="divide-y divide-border border-t border-border bg-muted/20">
                          {w.exercises.map((ex, i) => (
                            <li
                              key={`${w.id}-${i}`}
                              className={cn(
                                "flex items-center justify-between px-5 py-2 text-sm"
                              )}
                            >
                              <span className="truncate">{ex.name}</span>
                              <span className="ml-3 shrink-0 text-xs text-muted-foreground tabular-nums">
                                {ex.sets} × {ex.reps}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
