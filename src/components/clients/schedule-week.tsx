"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Plus,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  addDays,
  buildDateRange,
  formatDayHeader,
  isoDate,
  isToday,
  startOfWeek,
  type AvailableWorkout,
  type ScheduleRow,
} from "@/lib/scheduling";

const WINDOW_DAYS = 14; // Two weeks at a glance — most coaches plan ~10 days out.

interface Props {
  clientId: string;
  coachId: string;
  initialStart: string; // YYYY-MM-DD, Monday of the displayed week.
  rows: ScheduleRow[];
  available: AvailableWorkout[];
}

export function ScheduleWeek({
  clientId,
  coachId,
  initialStart,
  rows: initialRows,
  available,
}: Props) {
  const router = useRouter();
  const [start, setStart] = useState<Date>(() => new Date(`${initialStart}T00:00:00`));
  const [rows, setRows] = useState<ScheduleRow[]>(initialRows);
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dates = buildDateRange(start, WINDOW_DAYS);
  const byDate = new Map<string, ScheduleRow>();
  for (const r of rows) byDate.set(r.scheduled_date, r);

  function shiftWeek(direction: -1 | 1) {
    const next = addDays(start, direction * 7);
    setStart(next);
    // Refetch via the URL for date-bound caching consistency.
    router.replace(`?start=${isoDate(next)}`, { scroll: false });
    router.refresh();
  }

  async function assignWorkout(date: string, workout: AvailableWorkout) {
    setBusy(true);
    const supabase = createClient();
    const existing = byDate.get(date);

    if (existing) {
      const { error } = await supabase
        .from("scheduled_workouts")
        .update({
          source_type: "phase_workout",
          phase_workout_id: workout.id,
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
            ? { ...r, source_type: "phase_workout", phase_workout_id: workout.id, template_id: null }
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
          source_type: "phase_workout",
          phase_workout_id: workout.id,
        })
        .select("id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed")
        .single();
      setBusy(false);
      if (error || !data) {
        toast.error("Couldn't schedule", { description: error?.message });
        return;
      }
      setRows((rs) => [...rs, data as ScheduleRow]);
    }
    setEditingDate(null);
    toast.success("Scheduled");
    router.refresh();
  }

  async function markRest(date: string) {
    setBusy(true);
    const supabase = createClient();
    const existing = byDate.get(date);
    if (existing) {
      const { error } = await supabase
        .from("scheduled_workouts")
        .update({
          source_type: "rest",
          phase_workout_id: null,
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
            ? { ...r, source_type: "rest", phase_workout_id: null, template_id: null }
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
          source_type: "rest",
        })
        .select("id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed")
        .single();
      setBusy(false);
      if (error || !data) {
        toast.error("Couldn't mark rest", { description: error?.message });
        return;
      }
      setRows((rs) => [...rs, data as ScheduleRow]);
    }
    setEditingDate(null);
    toast.success("Marked as rest day");
    router.refresh();
  }

  async function clearDay(date: string) {
    const existing = byDate.get(date);
    if (!existing) {
      setEditingDate(null);
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
      toast.error("Couldn't clear", { description: error.message });
      return;
    }
    setRows((rs) => rs.filter((r) => r.id !== existing.id));
    setEditingDate(null);
    toast.success("Cleared");
    router.refresh();
  }

  const editingRow = editingDate ? byDate.get(editingDate) ?? null : null;

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {dates[0].toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          {" – "}
          {dates[dates.length - 1].toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        <div className="flex gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => shiftWeek(-1)}
            aria-label="Previous week"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              const today = startOfWeek(new Date());
              setStart(today);
              router.replace(`?start=${isoDate(today)}`, { scroll: false });
              router.refresh();
            }}
          >
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => shiftWeek(1)}
            aria-label="Next week"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-border">
        {dates.map((d) => {
          const key = isoDate(d);
          const row = byDate.get(key);
          const header = formatDayHeader(d);
          return (
            <button
              key={key}
              type="button"
              onClick={() => setEditingDate(key)}
              className={cn(
                "flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-muted/30",
                isToday(d) && "bg-foreground/5",
              )}
            >
              <div className="w-14 shrink-0">
                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {header.weekday}
                </p>
                <p className="text-sm font-medium tabular-nums">
                  {header.date}
                </p>
              </div>
              <div className="min-w-0 flex-1">
                {!row && (
                  <p className="text-sm text-muted-foreground">— No workout</p>
                )}
                {row?.source_type === "rest" && (
                  <p className="flex items-center gap-1.5 text-sm">
                    <Coffee aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                    Rest day
                  </p>
                )}
                {row?.source_type === "phase_workout" && (() => {
                  const w = available.find((x) => x.id === row.phase_workout_id);
                  return (
                    <p className="text-sm font-medium">
                      {w ? w.name : "(workout removed)"}
                      {w && (
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          · {w.phase_name} · {w.exercise_count} exercise
                          {w.exercise_count === 1 ? "" : "s"}
                        </span>
                      )}
                    </p>
                  );
                })()}
              </div>
              {row?.completed && (
                <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-foreground" />
              )}
              <Plus aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </button>
          );
        })}
      </Card>

      <Dialog
        open={editingDate !== null}
        onOpenChange={(o) => {
          if (!o) setEditingDate(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingDate
                ? new Date(`${editingDate}T00:00:00`).toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                This client has no active program with workouts yet. Create one
                in Training Program first, then come back to schedule it.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pick a workout
                </p>
                <div className="max-h-72 overflow-y-auto rounded-md border border-border">
                  {available.map((w) => {
                    const isCurrent =
                      editingRow?.source_type === "phase_workout" &&
                      editingRow.phase_workout_id === w.id;
                    return (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => editingDate && assignWorkout(editingDate, w)}
                        disabled={busy}
                        className={cn(
                          "flex w-full items-start gap-3 border-b border-border px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/30",
                          isCurrent && "bg-foreground/5",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{w.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {w.phase_name} · Day {w.day_number} · {w.exercise_count} exercise
                            {w.exercise_count === 1 ? "" : "s"}
                          </span>
                        </span>
                        {isCurrent && (
                          <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => editingDate && markRest(editingDate)}
                disabled={busy}
              >
                <Coffee aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                Rest day
              </Button>
              {editingRow && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => editingDate && clearDay(editingDate)}
                  disabled={busy}
                >
                  <X aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
                  Clear day
                </Button>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingDate(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
