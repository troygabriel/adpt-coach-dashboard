import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScheduleWeek } from "@/components/clients/schedule-week";
import {
  addDays,
  isoDate,
  startOfWeek,
  type AvailableWorkout,
  type ScheduleRow,
} from "@/lib/scheduling";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 14;

export default async function ClientSchedulePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ start?: string }>;
}) {
  const [{ clientId }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Default to this week's Monday. Honor ?start=YYYY-MM-DD if present.
  const requestedStart =
    typeof sp?.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.start)
      ? new Date(`${sp.start}T00:00:00`)
      : startOfWeek(new Date());
  const start = isoDate(requestedStart);
  const end = isoDate(addDays(requestedStart, WINDOW_DAYS - 1));

  // Pull schedule rows for the visible window.
  const { data: scheduleRows } = await supabase
    .from("scheduled_workouts")
    .select(
      "id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed",
    )
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);

  // Available workouts = phase_workouts from the client's active program.
  // The picker shows them grouped by phase.
  const { data: program } = await supabase
    .from("coaching_programs")
    .select(
      `id, status,
       program_phases (id, name, phase_number,
         phase_workouts (id, day_number, name, exercises))`,
    )
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const available: AvailableWorkout[] = (program?.program_phases ?? [])
    .flatMap((ph) =>
      (ph.phase_workouts ?? []).map((w) => ({
        id: w.id,
        phase_id: ph.id,
        phase_name: ph.name,
        phase_number: ph.phase_number,
        day_number: w.day_number,
        name: w.name,
        exercise_count: Array.isArray(w.exercises) ? w.exercises.length : 0,
      })),
    )
    .sort(
      (a, b) =>
        a.phase_number - b.phase_number || a.day_number - b.day_number,
    );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          Drop workouts on specific days. The client&apos;s mobile app reads
          this to show what to do today.
        </p>
      </div>

      <ScheduleWeek
        clientId={clientId}
        coachId={user.id}
        initialStart={start}
        rows={(scheduleRows ?? []) as ScheduleRow[]}
        available={available}
      />
    </div>
  );
}
