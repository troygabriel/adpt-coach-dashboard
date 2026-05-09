/**
 * Schedule resolution: given a date, the active phase's workouts, and any
 * scheduled_workouts overrides, return what the client actually sees on
 * that date.
 *
 * Mirrors the mobile resolver at
 * /home/troyg/troyg/Projects/ADPT/src/lib/scheduledWorkouts.ts:68-94 so the
 * dashboard's editor and the client's app agree byte-for-byte on what's
 * "today's workout."
 *
 * Default vs override:
 *   • A program's `phase_workouts` row defines the *default* assignment
 *     for that ISO weekday (Mon=1 … Sun=7).
 *   • A `scheduled_workouts` row for that date is an *override* — either
 *     a swap (different phase_workout), an explicit rest day, or a custom
 *     template.
 *   • The override always wins when present.
 */

export type ScheduleSourceType = "phase_workout" | "template" | "rest";

export type ScheduledRow = {
  id: string;
  client_id: string;
  coach_id: string;
  scheduled_date: string; // YYYY-MM-DD
  source_type: ScheduleSourceType;
  phase_workout_id: string | null;
  template_id: string | null;
  notes: string | null;
  completed: boolean;
};

export type PhaseWorkoutLite = {
  id: string;
  phase_id: string;
  phase_name: string;
  phase_number: number;
  day_number: number;
  name: string;
  exercise_count: number;
};

export type ResolvedDay =
  | {
      kind: "rest";
      source: "override";
      row: ScheduledRow;
    }
  | {
      kind: "workout";
      source: "default" | "override";
      workout: PhaseWorkoutLite;
      /** Present when source = "override". */
      row?: ScheduledRow;
    }
  | {
      kind: "empty";
      /** Reasons the day is blank. */
      reason: "no_program" | "no_default_for_weekday";
    };

/** Mon=1 … Sun=7. JS getDay() returns 0=Sun. */
export function isoWeekday(d: Date): number {
  return d.getDay() || 7;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function resolveDay(args: {
  date: Date;
  /** All schedule overrides for the displayed window, keyed by YYYY-MM-DD. */
  scheduledByDate: Map<string, ScheduledRow>;
  /** Active phase's phase_workouts, keyed by id (for override lookups). */
  workoutsById: Map<string, PhaseWorkoutLite>;
  /** Active phase's phase_workouts as an array (for default by weekday). */
  activePhaseWorkouts: PhaseWorkoutLite[];
}): ResolvedDay {
  const key = isoDate(args.date);
  const override = args.scheduledByDate.get(key);

  if (override) {
    if (override.source_type === "rest") {
      return { kind: "rest", source: "override", row: override };
    }
    if (override.source_type === "phase_workout" && override.phase_workout_id) {
      const w = args.workoutsById.get(override.phase_workout_id);
      if (w) return { kind: "workout", source: "override", workout: w, row: override };
    }
    // template_id branch: not yet wired into the editor; treat as empty.
  }

  if (args.activePhaseWorkouts.length === 0) {
    return { kind: "empty", reason: "no_program" };
  }
  const dow = isoWeekday(args.date);
  const def = args.activePhaseWorkouts.find((w) => w.day_number === dow);
  if (def) return { kind: "workout", source: "default", workout: def };
  return { kind: "empty", reason: "no_default_for_weekday" };
}

/** Build a 4-week grid (28 days) starting on the Monday on or before `anchor`. */
export function buildMonthGrid(anchor: Date): Date[] {
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const dow = isoWeekday(start);
  start.setDate(start.getDate() - (dow - 1));
  return Array.from({ length: 28 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
