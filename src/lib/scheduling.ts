// Helpers for the per-client schedule editor. Keep date logic here so the
// page + the editor agree on what "today" / "this week" mean.

export type ScheduleSourceType = "phase_workout" | "template" | "rest";

export type ScheduleRow = {
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

export type AvailableWorkout = {
  id: string;
  phase_id: string;
  phase_name: string;
  phase_number: number;
  day_number: number;
  name: string;
  exercise_count: number;
};

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(d: Date): Date {
  // Monday-first week. Most fitness coaches think in Monday → Sunday.
  const out = new Date(d);
  const day = out.getDay(); // 0=Sun
  const offset = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + offset);
  out.setHours(0, 0, 0, 0);
  return out;
}

export function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

export function buildDateRange(start: Date, days: number): Date[] {
  return Array.from({ length: days }, (_, i) => addDays(start, i));
}

export function formatDayHeader(d: Date): { weekday: string; date: string } {
  return {
    weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
}

export function isToday(d: Date): boolean {
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}
