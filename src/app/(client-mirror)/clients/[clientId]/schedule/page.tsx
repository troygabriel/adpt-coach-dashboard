import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ScheduleGrid } from "@/components/clients/schedule-grid";
import {
  isoDate,
  isoWeekday,
  type PhaseWorkoutLite,
  type ScheduledRow,
} from "@/lib/schedule-resolver";

export const dynamic = "force-dynamic";

const WINDOW_DAYS = 28;

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  out.setDate(out.getDate() - (isoWeekday(out) - 1));
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

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

  const requestedStart =
    typeof sp?.start === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.start)
      ? new Date(`${sp.start}T00:00:00`)
      : startOfWeek(new Date());
  const start = isoDate(requestedStart);
  const end = isoDate(addDays(requestedStart, WINDOW_DAYS - 1));

  const { data: scheduleRows } = await supabase
    .from("scheduled_workouts")
    .select(
      "id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed",
    )
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .gte("scheduled_date", start)
    .lte("scheduled_date", end);

  // Active program → active phase → phase_workouts. The grid uses these
  // both as the "available" pick list AND as the source of truth for
  // weekday defaults (via day_number).
  const { data: program } = await supabase
    .from("coaching_programs")
    .select(
      `id, status,
       program_phases (id, name, phase_number, status,
         phase_workouts (id, day_number, name, exercises))`,
    )
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const phases = program?.program_phases ?? [];
  const activePhase =
    phases.find((p: any) => p.status === "active") ?? phases[0] ?? null;
  const available: PhaseWorkoutLite[] = (activePhase?.phase_workouts ?? [])
    .map((w: any) => ({
      id: w.id,
      phase_id: activePhase!.id,
      phase_name: activePhase!.name,
      phase_number: activePhase!.phase_number,
      day_number: w.day_number,
      name: w.name,
      exercise_count: Array.isArray(w.exercises) ? w.exercises.length : 0,
    }))
    .sort((a, b) => a.day_number - b.day_number);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Schedule</h1>
        <p className="text-sm text-muted-foreground">
          The grid shows what your client will see. Defaults come from the
          active program; click any cell to override a single day.
        </p>
      </div>

      <ScheduleGrid
        clientId={clientId}
        coachId={user.id}
        initialStart={start}
        rows={(scheduleRows ?? []) as ScheduledRow[]}
        available={available}
      />
    </div>
  );
}
