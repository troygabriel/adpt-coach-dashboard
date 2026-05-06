import { ComplianceDonut } from "@/components/patterns/compliance-donut";

type Workout = {
  id: string;
  started_at: string;
  ended_at: string | null;
};

type Phase = {
  phase_workouts?: { id: string }[];
};

type Program = {
  status: string;
  program_phases?: Phase[];
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function computeCompletedInWindow(
  workouts: Workout[],
  start: Date,
  end: Date
): number {
  // Distinct dates with at least one started workout in the window.
  const days = new Set<string>();
  for (const w of workouts) {
    const t = new Date(w.started_at).getTime();
    if (t >= start.getTime() && t < end.getTime()) {
      days.add(w.started_at.slice(0, 10));
    }
  }
  return days.size;
}

function computeTargetPerWeek(programs: Program[]): number {
  // Use the active program's largest phase as the weekly target. Fallback 4.
  const active = programs.find((p) => p.status === "active");
  if (!active) return 4;
  const phases = active.program_phases ?? [];
  let max = 0;
  for (const p of phases) {
    const c = p.phase_workouts?.length ?? 0;
    if (c > max) max = c;
  }
  return max > 0 ? max : 4;
}

export function ComplianceRow({
  programs,
  workouts,
}: {
  programs: Program[];
  workouts: Workout[];
}) {
  const target = computeTargetPerWeek(programs);

  const now = new Date();
  // Anchor on local midnight so day boundaries are consistent.
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThisWeek = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);

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

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium">Workout compliance</h2>
        <span className="text-xs text-muted-foreground tabular-nums">
          target {target}/wk
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {windows.map((w) => {
          const completed = computeCompletedInWindow(workouts, w.start, w.end);
          const pct = w.future
            ? 0
            : target > 0
            ? Math.min(100, (completed / target) * 100)
            : 0;
          return (
            <div key={w.label} className="flex flex-col items-center gap-2">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                {w.label}
              </span>
              <ComplianceDonut
                percent={pct}
                muted={w.future}
                centerLabel={w.future ? "—" : `${Math.round(pct)}%`}
              />
              <span className="text-xs text-muted-foreground tabular-nums">
                {w.future ? "—" : `${completed} / ${target}`}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
