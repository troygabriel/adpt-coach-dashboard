"use client";

/**
 * 4-week schedule grid editor.
 *
 * Replaces the old per-day list dialog. The grid renders 28 days starting
 * on Monday on or before the displayed anchor; each cell shows the
 * resolved workout (default-from-program or explicit override) with a
 * glyph indicating which one. Click a cell to open a popover with three
 * actions: use the program default, pick a different workout, or mark
 * the day a rest day.
 *
 * The data model: scheduled_workouts is OVERRIDE-ONLY. The default comes
 * from phase_workouts.day_number. "Use program default" deletes the
 * override row for that date so the resolver falls back to the default
 * cleanly.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Copy,
  Dumbbell,
  RotateCcw,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  buildMonthGrid,
  isoDate,
  isoWeekday,
  resolveDay,
  type PhaseWorkoutLite,
  type ScheduledRow,
} from "@/lib/schedule-resolver";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type Props = {
  clientId: string;
  coachId: string;
  /** ISO YYYY-MM-DD anchor for the displayed 4-week window's first Monday. */
  initialStart: string;
  rows: ScheduledRow[];
  available: PhaseWorkoutLite[];
};

export function ScheduleGrid({
  clientId,
  coachId,
  initialStart,
  rows: initialRows,
  available,
}: Props) {
  const router = useRouter();
  const [anchor, setAnchor] = useState<Date>(
    () => new Date(`${initialStart}T00:00:00`),
  );
  const [rows, setRows] = useState<ScheduledRow[]>(initialRows);
  const [busy, setBusy] = useState(false);
  const [openDate, setOpenDate] = useState<string | null>(null);

  const days = useMemo(() => buildMonthGrid(anchor), [anchor]);
  const scheduledByDate = useMemo(() => {
    const m = new Map<string, ScheduledRow>();
    for (const r of rows) m.set(r.scheduled_date, r);
    return m;
  }, [rows]);
  const workoutsById = useMemo(() => {
    const m = new Map<string, PhaseWorkoutLite>();
    for (const w of available) m.set(w.id, w);
    return m;
  }, [available]);

  const todayIso = isoDate(new Date());

  const shiftWeeks = (delta: number) => {
    const next = new Date(anchor);
    next.setDate(next.getDate() + delta * 7);
    setAnchor(next);
    router.replace(`?start=${isoDate(next)}`, { scroll: false });
  };

  /** Apply an override (insert or update). */
  const upsertOverride = async (
    date: string,
    patch: { source_type: "phase_workout" | "rest"; phase_workout_id: string | null },
  ) => {
    setBusy(true);
    const supabase = createClient();
    const existing = scheduledByDate.get(date);
    if (existing) {
      const { error } = await supabase
        .from("scheduled_workouts")
        .update({
          source_type: patch.source_type,
          phase_workout_id: patch.phase_workout_id,
          template_id: null,
        })
        .eq("id", existing.id);
      setBusy(false);
      if (error) {
        toast.error("Couldn't update", { description: error.message });
        return;
      }
      setRows((rs) =>
        rs.map((r) =>
          r.id === existing.id
            ? {
                ...r,
                source_type: patch.source_type,
                phase_workout_id: patch.phase_workout_id,
                template_id: null,
              }
            : r,
        ),
      );
    } else {
      const { data, error } = await supabase
        .from("scheduled_workouts")
        .insert({
          client_id: clientId,
          coach_id: coachId,
          scheduled_date: date,
          source_type: patch.source_type,
          phase_workout_id: patch.phase_workout_id,
        })
        .select(
          "id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed",
        )
        .single();
      setBusy(false);
      if (error || !data) {
        toast.error("Couldn't schedule", { description: error?.message });
        return;
      }
      setRows((rs) => [...rs, data as ScheduledRow]);
    }
    setOpenDate(null);
    router.refresh();
  };

  /** Delete the override for this date — reverts to program default. */
  const clearOverride = async (date: string) => {
    const existing = scheduledByDate.get(date);
    if (!existing) {
      setOpenDate(null);
      return;
    }
    setBusy(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("scheduled_workouts")
      .delete()
      .eq("id", existing.id);
    setBusy(false);
    if (error) {
      toast.error("Couldn't reset", { description: error.message });
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== existing.id));
    setOpenDate(null);
    toast.success("Reverted to program default");
    router.refresh();
  };

  /**
   * Copy the resolved workouts of the displayed first week into the
   * second week as explicit overrides. Useful for stamping the same
   * cadence forward when the program default is wrong for a phase shift.
   */
  const copyFirstWeekToNext = async () => {
    const firstWeek = days.slice(0, 7);
    const secondWeekStart = days[7];
    const supabase = createClient();
    setBusy(true);

    const inserts: Array<{
      client_id: string;
      coach_id: string;
      scheduled_date: string;
      source_type: "phase_workout" | "rest";
      phase_workout_id: string | null;
    }> = [];

    for (let i = 0; i < 7; i++) {
      const sourceDate = firstWeek[i];
      const targetDate = new Date(secondWeekStart);
      targetDate.setDate(secondWeekStart.getDate() + i);
      const targetIso = isoDate(targetDate);
      // Skip if target already has an override.
      if (scheduledByDate.has(targetIso)) continue;

      const resolved = resolveDay({
        date: sourceDate,
        scheduledByDate,
        workoutsById,
        activePhaseWorkouts: available,
      });
      if (resolved.kind === "rest") {
        inserts.push({
          client_id: clientId,
          coach_id: coachId,
          scheduled_date: targetIso,
          source_type: "rest",
          phase_workout_id: null,
        });
      } else if (resolved.kind === "workout") {
        inserts.push({
          client_id: clientId,
          coach_id: coachId,
          scheduled_date: targetIso,
          source_type: "phase_workout",
          phase_workout_id: resolved.workout.id,
        });
      }
      // empty days: leave as-is (program default for new week may differ).
    }

    if (inserts.length === 0) {
      setBusy(false);
      toast.info("Nothing to copy", {
        description: "Next week already has overrides for every day.",
      });
      return;
    }

    const { data, error } = await supabase
      .from("scheduled_workouts")
      .insert(inserts).select(
        "id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed",
      );
    setBusy(false);
    if (error) {
      toast.error("Couldn't copy week", { description: error.message });
      return;
    }
    setRows((rs) => [...rs, ...((data ?? []) as ScheduledRow[])]);
    toast.success(`Copied ${inserts.length} day${inserts.length === 1 ? "" : "s"} forward`);
    router.refresh();
  };

  const lastDay = days[days.length - 1];

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {days[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" – "}
          {lastDay.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={copyFirstWeekToNext}
            disabled={busy}
          >
            <Copy aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
            Copy week 1 → week 2
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => shiftWeeks(-1)}
            aria-label="Previous week"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              const dow = isoWeekday(today);
              today.setDate(today.getDate() - (dow - 1));
              setAnchor(today);
              router.replace(`?start=${isoDate(today)}`, { scroll: false });
            }}
          >
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => shiftWeeks(1)}
            aria-label="Next week"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="grid grid-cols-7 border-b border-border">
          {WEEKDAY_LABELS.map((d) => (
            <div
              key={d}
              className="px-2 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d) => {
            const key = isoDate(d);
            const resolved = resolveDay({
              date: d,
              scheduledByDate,
              workoutsById,
              activePhaseWorkouts: available,
            });
            const isToday = key === todayIso;
            const overrideExists = scheduledByDate.has(key);

            return (
              <Popover
                key={key}
                open={openDate === key}
                onOpenChange={(o) => setOpenDate(o ? key : null)}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-[80px] flex-col items-start gap-1 border-b border-r border-border p-2 text-left transition-colors hover:bg-muted/40",
                      isToday && "bg-foreground/5",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center gap-1 text-[11px] tabular-nums",
                        isToday
                          ? "font-semibold text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {d.getDate()}
                      {overrideExists && (
                        <span
                          aria-hidden="true"
                          className="h-1 w-1 rounded-full bg-foreground"
                          title="Override"
                        />
                      )}
                    </span>
                    <CellBody resolved={resolved} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <CellEditor
                    date={key}
                    available={available}
                    overrideExists={overrideExists}
                    busy={busy}
                    onPick={(workoutId) =>
                      upsertOverride(key, {
                        source_type: "phase_workout",
                        phase_workout_id: workoutId,
                      })
                    }
                    onMarkRest={() =>
                      upsertOverride(key, {
                        source_type: "rest",
                        phase_workout_id: null,
                      })
                    }
                    onClear={() => clearOverride(key)}
                  />
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Dumbbell aria-hidden="true" className="h-3 w-3" />
          From program
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1 w-1 rounded-full bg-foreground" />
          Manual override
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Coffee aria-hidden="true" className="h-3 w-3" />
          Rest day
        </span>
      </p>
    </div>
  );
}

function CellBody({
  resolved,
}: {
  resolved: ReturnType<typeof resolveDay>;
}) {
  if (resolved.kind === "empty") {
    return (
      <span className="text-[11px] text-muted-foreground/70">
        {resolved.reason === "no_program" ? "No program" : "—"}
      </span>
    );
  }
  if (resolved.kind === "rest") {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
        <Coffee aria-hidden="true" className="h-3 w-3" />
        Rest
      </span>
    );
  }
  return (
    <span className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground">
      {resolved.workout.name}
    </span>
  );
}

function CellEditor({
  date,
  available,
  overrideExists,
  busy,
  onPick,
  onMarkRest,
  onClear,
}: {
  date: string;
  available: PhaseWorkoutLite[];
  overrideExists: boolean;
  busy: boolean;
  onPick: (workoutId: string) => void;
  onMarkRest: () => void;
  onClear: () => void;
}) {
  const [picking, setPicking] = useState(false);
  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (picking) {
    return (
      <div className="space-y-2 p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pick workout
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setPicking(false)}
          >
            Back
          </Button>
        </div>
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {available.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => onPick(w.id)}
              disabled={busy}
              className="flex w-full flex-col items-start rounded px-2 py-1.5 text-left text-xs transition-colors hover:bg-muted disabled:opacity-50"
            >
              <span className="font-medium">{w.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {w.phase_name} · Day {w.day_number} · {w.exercise_count} exercise
                {w.exercise_count === 1 ? "" : "s"}
              </span>
            </button>
          ))}
          {available.length === 0 && (
            <p className="px-2 py-3 text-xs text-muted-foreground">
              No active program. Create one in the Training Program tab first.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1 p-2">
      <p className="px-2 py-1.5 text-xs font-semibold text-foreground">
        {dateLabel}
      </p>
      <button
        type="button"
        onClick={() => setPicking(true)}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
      >
        <Dumbbell aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        Pick a different workout
      </button>
      <button
        type="button"
        onClick={onMarkRest}
        disabled={busy}
        className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors hover:bg-muted disabled:opacity-50"
      >
        <Coffee aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        Mark as rest day
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={busy || !overrideExists}
        className={cn(
          "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors",
          overrideExists ? "hover:bg-muted" : "opacity-40",
        )}
        title={
          overrideExists ? "Revert to the program default for this weekday" : ""
        }
      >
        <RotateCcw aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
        Use program default
      </button>
      <div className="flex items-center gap-2 px-2 pt-2 text-[10px] text-muted-foreground">
        <CalendarDays aria-hidden="true" className="h-3 w-3" />
        Default comes from your active program.
      </div>
    </div>
  );
}
