/**
 * Habit math, ported from /home/troyg/troyg/Projects/ADPT/src/lib/habits.ts
 * (lines 112-156). Server-safe — no React, no Supabase.
 *
 * Same shape so the dashboard's read of habit streaks matches what the
 * mobile app shows for the same client.
 */

export type HabitLogLite = {
  assignment_id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
};

/** Walks back from today counting consecutive completed days. */
export function computeCurrentStreak(
  logs: HabitLogLite[],
  assignmentId: string,
  today: string,
): number {
  const completedSet = new Set(
    logs
      .filter((l) => l.assignment_id === assignmentId && l.completed)
      .map((l) => l.date),
  );
  let streak = 0;
  const cursor = new Date(`${today}T00:00:00`);
  for (let i = 0; i < 365; i++) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    const d = String(cursor.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${d}`;
    if (completedSet.has(key)) streak += 1;
    else break;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/** Count of completed days in the trailing 7 days. */
export function computeWeeklyCompleted(
  logs: HabitLogLite[],
  assignmentId: string,
): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return logs.filter(
    (l) =>
      l.assignment_id === assignmentId &&
      l.completed &&
      new Date(`${l.date}T00:00:00`) >= cutoff,
  ).length;
}
