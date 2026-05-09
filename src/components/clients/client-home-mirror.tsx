"use client";

/**
 * Read-only mirror of the mobile Home tab.
 *
 * Closer than the v0 today-mirror: 14-day day strip with prev/next arrows
 * and a Today jump, exercise list per day, macro progress bars, habits
 * with streak + weekly count, and a MY PROGRESS card grid.
 *
 * Trainerize-style: "Your client sees the exact same thing, without
 * editing controls." Inline admin links open the actual editors.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Dumbbell,
  ListChecks,
  Pencil,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeCurrentStreak,
  computeWeeklyCompleted,
  type HabitLogLite,
} from "@/lib/habits-stats";
import {
  isoDate,
  resolveDay,
  type PhaseWorkoutLite,
  type ScheduledRow,
} from "@/lib/schedule-resolver";

type Habit = {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
  frequency?: "daily" | "weekly" | null;
};

type CoachTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: string;
  scheduled_for: string;
  manually_completed_at: string | null;
};

type Macros = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
} | null;

type WorkoutSession = {
  id: string;
  started_at: string;
  ended_at: string | null;
  title: string | null;
};

type BodyStat = {
  date: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
};

type Exercise = {
  name: string;
  sets?: number | null;
  reps?: string | number | null;
  rir?: number | null;
};

type PhaseWorkoutDetail = PhaseWorkoutLite & {
  exercises: Exercise[];
};

const STRIP_DAYS = 14;
const STRIP_PAST = 7;

function buildStrip(center: Date, focus: Date): Date[] {
  // Strip is anchored relative to `center` so prev/next shifts the window.
  // `focus` is what's selected — used by callers, not relevant here.
  void focus;
  const start = new Date(center);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - STRIP_PAST);
  return Array.from({ length: STRIP_DAYS }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

export function ClientHomeMirror({
  clientId,
  clientName,
  scheduled,
  phaseWorkouts,
  habits,
  habitLogs,
  coachTasks,
  macros,
  programId,
  recentWorkouts,
  bodyStats,
}: {
  clientId: string;
  clientName: string | null;
  scheduled: ScheduledRow[];
  phaseWorkouts: PhaseWorkoutDetail[];
  habits: Habit[];
  habitLogs: HabitLogLite[];
  coachTasks: CoachTask[];
  macros: Macros;
  programId: string | null;
  /** workout_sessions in the last 30+ days, used for completions + this-week count. */
  recentWorkouts: WorkoutSession[];
  bodyStats: BodyStat[];
}) {
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const todayIso = isoDate(today);

  const [stripCenter, setStripCenter] = useState<Date>(today);
  const [selected, setSelected] = useState<Date>(today);
  const days = useMemo(() => buildStrip(stripCenter, selected), [stripCenter, selected]);
  const selectedIso = isoDate(selected);
  const isViewingToday = selectedIso === todayIso;

  const scheduledByDate = useMemo(() => {
    const m = new Map<string, ScheduledRow>();
    for (const r of scheduled) m.set(r.scheduled_date, r);
    return m;
  }, [scheduled]);
  const workoutsById = useMemo(() => {
    const m = new Map<string, PhaseWorkoutDetail>();
    for (const w of phaseWorkouts) m.set(w.id, w);
    return m;
  }, [phaseWorkouts]);

  const sessionsByDate = useMemo(() => {
    const m = new Map<string, WorkoutSession>();
    for (const s of recentWorkouts) {
      m.set(s.started_at.slice(0, 10), s);
    }
    return m;
  }, [recentWorkouts]);

  const resolved = useMemo(
    () =>
      resolveDay({
        date: selected,
        scheduledByDate,
        workoutsById,
        activePhaseWorkouts: phaseWorkouts,
      }),
    [selected, scheduledByDate, workoutsById, phaseWorkouts],
  );

  const sessionForSelected = sessionsByDate.get(selectedIso) ?? null;

  const visibleHabits = habits.filter((h) => h.active);
  const todayTasks = coachTasks.filter((t) => t.scheduled_for === selectedIso);

  // MY PROGRESS metrics
  const latestStat = bodyStats[0] ?? null;
  const weightLbs = latestStat?.weight_kg
    ? (latestStat.weight_kg * 2.20462).toFixed(1)
    : null;
  const bodyFatPct =
    latestStat?.body_fat_pct != null ? latestStat.body_fat_pct : null;

  const workoutsThisWeek = useMemo(() => {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - (cutoff.getDay() || 7) + 1); // Monday
    return recentWorkouts.filter(
      (s) => new Date(s.started_at).getTime() >= cutoff.getTime(),
    ).length;
  }, [recentWorkouts]);

  // Workout streak: consecutive days with a logged session, walking back from today.
  const streak = useMemo(() => {
    const set = new Set(recentWorkouts.map((s) => s.started_at.slice(0, 10)));
    let n = 0;
    const cursor = new Date(today);
    for (let i = 0; i < 365; i++) {
      if (set.has(isoDate(cursor))) n++;
      else break;
      cursor.setDate(cursor.getDate() - 1);
    }
    return n;
  }, [recentWorkouts, today]);

  const shiftStrip = (delta: number) => {
    const next = new Date(stripCenter);
    next.setDate(next.getDate() + delta * STRIP_DAYS);
    setStripCenter(next);
    // Re-anchor selection if the new window doesn't include current selection.
    const candidateStart = new Date(next);
    candidateStart.setDate(candidateStart.getDate() - STRIP_PAST);
    const candidateEnd = new Date(candidateStart);
    candidateEnd.setDate(candidateEnd.getDate() + STRIP_DAYS - 1);
    if (selected < candidateStart || selected > candidateEnd) {
      setSelected(next);
    }
  };

  const jumpToToday = () => {
    setStripCenter(today);
    setSelected(today);
  };

  return (
    <section className="space-y-5 rounded-xl border border-border bg-card p-5">
      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Things to do · {clientName ?? "client"} view
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {selected.toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftStrip(-1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Previous days"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          </button>
          {!isViewingToday && (
            <button
              type="button"
              onClick={jumpToToday}
              className="inline-flex h-7 items-center rounded px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Today
            </button>
          )}
          <button
            type="button"
            onClick={() => shiftStrip(1)}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Next days"
          >
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Day strip */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {days.map((d) => {
          const iso = isoDate(d);
          const isSel = iso === selectedIso;
          const isToday = iso === todayIso;
          const hasOverride = scheduledByDate.has(iso);
          const session = sessionsByDate.get(iso);
          const dayResolved = resolveDay({
            date: d,
            scheduledByDate,
            workoutsById,
            activePhaseWorkouts: phaseWorkouts,
          });
          const isRest = dayResolved.kind === "rest";
          return (
            <button
              key={iso}
              type="button"
              onClick={() => setSelected(d)}
              className={cn(
                "flex h-16 w-12 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md border text-center transition-colors",
                isSel
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-muted/40",
              )}
            >
              <span
                className={cn(
                  "text-[10px] font-medium uppercase tracking-wide",
                  isSel ? "text-background/80" : "text-muted-foreground",
                )}
              >
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={cn(
                  "text-sm tabular-nums",
                  isToday && !isSel && "font-bold",
                  isSel && "font-semibold",
                )}
              >
                {d.getDate()}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {session && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      isSel ? "bg-background" : "bg-foreground",
                    )}
                    aria-label="Workout logged"
                  />
                )}
                {!session && hasOverride && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full",
                      isSel ? "bg-background/60" : "bg-foreground/60",
                    )}
                    aria-label="Override scheduled"
                  />
                )}
                {isRest && (
                  <span
                    className={cn(
                      "h-1 w-1 rounded-full opacity-40",
                      isSel ? "bg-background" : "bg-foreground",
                    )}
                    aria-label="Rest day"
                  />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Macro progress bars (shown when targets exist) */}
      {macros && (
        <div className="space-y-2 rounded-md border border-border bg-background p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Daily nutrition
            </p>
            <Link
              href={`/clients/${clientId}/meals`}
              className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
            >
              <Pencil aria-hidden="true" className="h-3 w-3" />
              Edit
            </Link>
          </div>
          <MacroBar label="Calories" value={macros.calories} unit="kcal" />
          <MacroBar label="Protein" value={macros.protein_g} unit="g" />
          <MacroBar label="Carbs" value={macros.carbs_g} unit="g" />
          <MacroBar label="Fat" value={macros.fat_g} unit="g" />
        </div>
      )}

      {/* Today's items */}
      <ul className="space-y-2">
        {resolved.kind === "workout" && (
          <li>
            <WorkoutItem
              workout={resolved.workout as PhaseWorkoutDetail}
              completed={!!sessionForSelected}
              source={resolved.source}
              programId={programId}
              clientId={clientId}
            />
          </li>
        )}
        {resolved.kind === "rest" && (
          <li>
            <SimpleRow
              icon={Coffee}
              title="Rest day"
              subtitle="No workout planned"
            />
          </li>
        )}
        {resolved.kind === "empty" && (
          <li>
            <SimpleRow
              icon={Dumbbell}
              title="No workout assigned"
              subtitle={
                resolved.reason === "no_program"
                  ? "Client has no active program"
                  : "Program has no default for this weekday"
              }
              adminLink={
                resolved.reason === "no_program"
                  ? "/programs"
                  : `/clients/${clientId}/schedule`
              }
              adminLabel={
                resolved.reason === "no_program" ? "Create one" : "Assign one"
              }
              empty
            />
          </li>
        )}

        {todayTasks.map((t) => (
          <li key={t.id}>
            <SimpleRow
              icon={taskIcon(t.task_type)}
              title={t.title}
              subtitle={t.description ?? null}
              done={!!t.manually_completed_at}
            />
          </li>
        ))}

        {visibleHabits.map((h) => {
          const log = habitLogs.find(
            (l) => l.assignment_id === h.id && l.date === selectedIso,
          );
          const completed = !!log?.completed;
          const streak = computeCurrentStreak(habitLogs, h.id, todayIso);
          const weekly = computeWeeklyCompleted(habitLogs, h.id);
          return (
            <li key={h.id}>
              <SimpleRow
                icon={ListChecks}
                title={h.name}
                subtitle={`${weekly}/7 this week${streak > 1 ? ` · ${streak}-day streak` : ""}`}
                done={completed}
                adminLink={`/clients/${clientId}/habits`}
                adminLabel="Edit"
              />
            </li>
          );
        })}
      </ul>

      {/* MY PROGRESS card grid */}
      <div>
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          My progress
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <ProgressCard
            label="Scale weight"
            value={weightLbs ?? "—"}
            unit={weightLbs ? "lbs" : undefined}
          />
          <ProgressCard
            label="Body fat"
            value={bodyFatPct != null ? `${bodyFatPct}` : "—"}
            unit={bodyFatPct != null ? "%" : undefined}
          />
          <ProgressCard
            label="Streak"
            value={`${streak}`}
            unit={streak === 1 ? "day" : "days"}
          />
          <ProgressCard
            label="Workouts"
            value={`${workoutsThisWeek}`}
            unit={workoutsThisWeek === 1 ? "session" : "sessions"}
            sub="this week"
          />
        </div>
      </div>
    </section>
  );
}

function WorkoutItem({
  workout,
  completed,
  source,
  programId,
  clientId,
}: {
  workout: PhaseWorkoutDetail;
  completed: boolean;
  source: "default" | "override";
  programId: string | null;
  clientId: string;
}) {
  const exercises = Array.isArray(workout.exercises) ? workout.exercises : [];
  return (
    <div className="rounded-md border border-border bg-background">
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
            completed
              ? "border-foreground bg-foreground text-background"
              : "border-border text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {completed ? <Check /> : <Dumbbell className="h-3 w-3" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                "truncate text-sm font-medium",
                completed && "text-muted-foreground",
              )}
            >
              {workout.name}
            </p>
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                source === "default"
                  ? "bg-muted text-muted-foreground"
                  : "bg-foreground/10 text-foreground",
              )}
            >
              {source === "default" ? "From program" : "Override"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {workout.phase_name} · Day {workout.day_number} · {exercises.length}{" "}
            exercise{exercises.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          href={programId ? `/programs/${programId}` : `/clients/${clientId}/training-program`}
          className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Open builder
        </Link>
      </div>
      {exercises.length > 0 && (
        <ul className="border-t border-border divide-y divide-border">
          {exercises.map((ex, i) => (
            <li
              key={i}
              className="flex items-center justify-between px-3 py-1.5 text-xs"
            >
              <span className="truncate">{ex.name}</span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {ex.sets ?? "—"} × {ex.reps ?? "—"}
                {ex.rir != null && ` · RIR ${ex.rir}`}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SimpleRow({
  icon: Icon,
  title,
  subtitle,
  done,
  adminLink,
  adminLabel,
  empty,
}: {
  icon: typeof Dumbbell;
  title: string;
  subtitle?: string | null;
  done?: boolean;
  adminLink?: string;
  adminLabel?: string;
  empty?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border px-3 py-2.5",
        empty
          ? "border-dashed border-border bg-background"
          : "border-border bg-background",
      )}
    >
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
          done
            ? "border-foreground bg-foreground text-background"
            : "border-border text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {done ? <Check /> : <Icon className="h-3 w-3" />}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-medium",
            done && "text-muted-foreground",
          )}
        >
          {title}
        </p>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {adminLink && adminLabel && (
        <Link
          href={adminLink}
          className="shrink-0 text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          {adminLabel}
        </Link>
      )}
    </div>
  );
}

function MacroBar({
  label,
  value,
  unit,
}: {
  label: string;
  value: number | null;
  unit: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {value != null ? `${value} ${unit}` : "—"}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
        {/* Progress is a static "target" bar — actual consumed nutrition
            isn't tracked yet on the client side, so we render the full
            bar to communicate the target value rather than fake progress. */}
        <div
          className={cn(
            "h-full",
            value != null ? "bg-foreground/40" : "bg-foreground/10",
          )}
          style={{ width: value != null ? "100%" : "0%" }}
        />
      </div>
    </div>
  );
}

function ProgressCard({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            {unit}
          </span>
        )}
      </p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Check() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="h-3 w-3"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 6.5L5 9l4.5-5.5" />
    </svg>
  );
}

function taskIcon(taskType: string): typeof Dumbbell {
  switch (taskType) {
    case "macros":
      return UtensilsCrossed;
    default:
      return ListChecks;
  }
}
