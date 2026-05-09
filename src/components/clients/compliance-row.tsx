import { ComplianceDonut } from "@/components/patterns/compliance-donut";

type Workout = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

type ScheduledRow = {
  id: string;
  scheduled_date: string; // YYYY-MM-DD
  source_type: "phase_workout" | "template" | "rest";
  completed: boolean;
};

/**
 * Subset of the active program's phase_workouts the row needs to compute
 * the "from program" fallback. Only `day_number` matters here — the
 * client passes us the active phase's whole list.
 */
type ProgramDay = {
  day_number: number;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function workoutDayKeys(workouts: Workout[]): Set<string> {
  const out = new Set<string>();
  for (const w of workouts) {
    out.add(w.started_at.slice(0, 10));
  }
  return out;
}

function inWindow(ymd: string, start: Date, end: Date): boolean {
  // window is [start, end). Use string compare since YYYY-MM-DD sorts lex.
  return ymd >= isoDate(start) && ymd < isoDate(end);
}

/** ISO weekday: Mon=1 … Sun=7. JS getDay returns 0=Sun, hence the wrap. */
function isoWeekday(d: Date): number {
  return d.getDay() || 7;
}

export function ComplianceRow({
  scheduled,
  workouts,
  programDays,
}: {
  /** All schedule rows for the client across the visible windows. */
  scheduled: ScheduledRow[];
  /** Logged workout sessions. */
  workouts: Workout[];
  /**
   * phase_workouts of the active program's active phase. Used as the
   * fallback target when the coach hasn't explicitly scheduled days yet.
   * Empty array when no active program.
   */
  programDays: ProgramDay[];
}) {
  const now = new Date();
  // Anchor on local midnight so day boundaries are consistent.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  // Monday-anchored weeks match the schedule editor and the mobile day strip.
  const dow = isoWeekday(today);
  const startOfThisWeek = new Date(today.getTime() - (dow - 1) * 24 * 60 * 60 * 1000);

  const windows: Array<{ label: string; start: Date; end: Date; future: boolean }> = [
    {
      label: "2 weeks ago",
      start: new Date(startOfThisWeek.getTime() - 2 * WEEK_MS),
      end: new Date(startOfThisWeek.getTime() - WEEK_MS),
      future: false,
    },
    {
      label: "Last week",
      start: new Date(startOfThisWeek.getTime() - WEEK_MS),
      end: new Date(startOfThisWeek.getTime()),
      future: false,
    },
    {
      label: "This week",
      start: new Date(startOfThisWeek.getTime()),
      end: new Date(startOfThisWeek.getTime() + WEEK_MS),
      future: false,
    },
    {
      label: "Next week",
      start: new Date(startOfThisWeek.getTime() + WEEK_MS),
      end: new Date(startOfThisWeek.getTime() + 2 * WEEK_MS),
      future: true,
    },
  ];

  const workoutDays = workoutDayKeys(workouts);

  // Distinct ISO weekdays the program targets per week (e.g. a 5-day program
  // returns a Set of {1,2,3,4,5}). Used both for the "/wk" target and to
  // decide whether a logged workout day "counts" against the program slot.
  const programWeekdays = new Set(programDays.map((d) => d.day_number));
  const programTargetCount = programWeekdays.size;

  // Header target prefers schedule when this-week has any non-rest rows;
  // otherwise it shows the program's per-week slot count.
  const thisWeekScheduled = scheduled.filter(
    (s) =>
      s.source_type !== "rest" &&
      inWindow(s.scheduled_date, windows[2].start, windows[2].end),
  );
  const usingProgramFallback =
    thisWeekScheduled.length === 0 && programTargetCount > 0;

  const headerLabel = usingProgramFallback
    ? `target ${programTargetCount}/wk · from program`
    : thisWeekScheduled.length > 0
      ? `target ${thisWeekScheduled.length}/wk`
      : "no schedule";

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Workout compliance</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          {headerLabel}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {windows.map((w) => {
          const weekScheduled = scheduled.filter(
            (s) =>
              s.source_type !== "rest" &&
              inWindow(s.scheduled_date, w.start, w.end),
          );

          // Two paths: scheduled-driven (preferred when any explicit rows
          // exist for the window) or program-fallback (no schedule but the
          // program defines a default weekly cadence).
          let target = 0;
          let completed = 0;
          let mode: "scheduled" | "program" | "empty" = "empty";

          if (weekScheduled.length > 0) {
            mode = "scheduled";
            target = weekScheduled.length;
            for (const s of weekScheduled) {
              if (s.completed || workoutDays.has(s.scheduled_date)) completed++;
            }
          } else if (programTargetCount > 0) {
            mode = "program";
            target = programTargetCount;
            // Walk every date in the window; a date "counts as completed"
            // when its weekday is one of the program's slot weekdays AND
            // a workout was logged that day.
            for (
              let cur = new Date(w.start);
              cur < w.end;
              cur = new Date(cur.getTime() + 24 * 60 * 60 * 1000)
            ) {
              const ymd = isoDate(cur);
              if (
                programWeekdays.has(isoWeekday(cur)) &&
                workoutDays.has(ymd)
              ) {
                completed++;
              }
            }
          }

          const pct = w.future
            ? 0
            : target > 0
              ? Math.min(100, (completed / target) * 100)
              : 0;

          const display =
            mode === "empty"
              ? "—"
              : `${completed} / ${target}`;

          return (
            <div key={w.label} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {w.label}
              </span>
              <ComplianceDonut
                percent={pct}
                muted={w.future || mode === "empty"}
                centerLabel={
                  w.future || mode === "empty" ? "—" : `${Math.round(pct)}%`
                }
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {w.future ? "—" : display}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
