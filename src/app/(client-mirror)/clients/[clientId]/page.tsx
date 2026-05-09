import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ClientDetail } from "@/components/clients/client-detail";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Fetch client relationship
  const { data: coachClient } = await supabase
    .from("coach_clients")
    .select("*")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .single();

  if (!coachClient) notFound();

  // Fetch client profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, email, goal, role, weight_kg, height_cm")
    .eq("id", clientId)
    .single();

  // Fetch assigned programs
  const { data: programs } = await supabase
    .from("coaching_programs")
    .select("id, name, status, start_date, created_at, program_phases(id, name, status, phase_number)")
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch recent workout sessions (last 30)
  const { data: workouts } = await supabase
    .from("workout_sessions")
    .select("id, title, started_at, ended_at")
    .eq("user_id", clientId)
    .order("started_at", { ascending: false })
    .limit(30);

  // Fetch body stats
  const { data: bodyStats } = await supabase
    .from("body_stats")
    .select("id, date, weight_kg, body_fat_pct")
    .eq("client_id", clientId)
    .order("date", { ascending: false })
    .limit(30);

  // Fetch client macros
  const { data: macros } = await supabase
    .from("client_macros")
    .select("calories, protein_g, carbs_g, fat_g, effective_from")
    .eq("client_id", clientId)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch coach notes
  const { data: notes } = await supabase
    .from("coach_notes")
    .select("id, body, created_at")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(10);

  // Fetch intake (filled by client during onboarding)
  const { data: intake } = await supabase
    .from("client_intakes")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  // Fetch coach-scheduled tasks for this client (any date — past + future)
  const { data: coachTasks } = await supabase
    .from("coach_tasks")
    .select("*")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .order("scheduled_for", { ascending: true });

  // Fetch habit assignments (active + paused, both shown in the dashboard)
  const { data: habits } = await supabase
    .from("habit_assignments")
    .select("*")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  // Pull schedule rows for the compliance window AND the home-mirror day
  // strip (14 days back, 14 days forward — covers both the compliance row
  // donuts and the day-strip popovers).
  const todayLocal = new Date();
  const dowMon = todayLocal.getDay() || 7;
  const startThisWeek = new Date(todayLocal);
  startThisWeek.setHours(0, 0, 0, 0);
  startThisWeek.setDate(startThisWeek.getDate() - (dowMon - 1));
  const scheduleFrom = new Date(startThisWeek);
  scheduleFrom.setDate(scheduleFrom.getDate() - 14);
  const scheduleTo = new Date(startThisWeek);
  scheduleTo.setDate(scheduleTo.getDate() + 14);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const { data: scheduled } = await supabase
    .from("scheduled_workouts")
    .select(
      "id, client_id, coach_id, scheduled_date, source_type, phase_workout_id, template_id, notes, completed",
    )
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .gte("scheduled_date", fmt(scheduleFrom))
    .lte("scheduled_date", fmt(scheduleTo));

  // For the today-mirror we need the active program's phase_workouts so we
  // can resolve scheduled_workouts.phase_workout_id → workout name/exercises.
  const todayIso = fmt(todayLocal);
  const { data: activeProgram } = await supabase
    .from("coaching_programs")
    .select(
      `id,
       program_phases (
         id, status,
         phase_workouts (id, name, day_number, exercises)
       )`,
    )
    .eq("client_id", clientId)
    .eq("coach_id", user.id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const phaseWorkouts =
    (activeProgram?.program_phases ?? []).flatMap((ph: any) =>
      (ph.phase_workouts ?? []).map((w: any) => ({
        id: w.id,
        name: w.name,
        day_number: w.day_number,
        exercises: w.exercises,
      })),
    );

  // Compliance fallback target: when no schedule exists yet, use the active
  // phase's distinct day_numbers as the per-week target. Pick the phase
  // marked active, or the first phase if none are flagged.
  const phases = activeProgram?.program_phases ?? [];
  const activePhase =
    phases.find((p: any) => p.status === "active") ?? phases[0] ?? null;
  const programDays: { day_number: number }[] = (
    activePhase?.phase_workouts ?? []
  ).map((w: any) => ({ day_number: w.day_number }));

  // Pull 30 days of habit logs so the home-mirror can show streaks +
  // weekly counts the same way the mobile Home tab does.
  const habitLogsFrom = new Date(todayLocal);
  habitLogsFrom.setDate(habitLogsFrom.getDate() - 30);
  const { data: habitLogs } = await supabase
    .from("habit_logs")
    .select("assignment_id, date, completed")
    .eq("client_id", clientId)
    .gte("date", fmt(habitLogsFrom))
    .lte("date", todayIso);

  // Today's session, if any (used to mark workout done in the mirror).
  const todayStart = `${todayIso}T00:00:00`;
  const todayEnd = `${todayIso}T23:59:59`;
  const { data: todaySession } = await supabase
    .from("workout_sessions")
    .select("id, title, started_at, ended_at")
    .eq("user_id", clientId)
    .gte("started_at", todayStart)
    .lte("started_at", todayEnd)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Activity-rail extras: progress photos + recent messages between
  // coach and client. Workouts + body_stats already fetched above; we'll
  // just slice them client-side for the rail.
  const [{ data: photoRows }, { data: conversation }] = await Promise.all([
    supabase
      .from("progress_photos")
      .select("id, created_at, pose")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("conversations")
      .select("id")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .maybeSingle(),
  ]);

  const { data: recentMessages } = conversation?.id
    ? await supabase
        .from("messages")
        .select("id, created_at, content, sender_id")
        .eq("conversation_id", conversation.id)
        .order("created_at", { ascending: false })
        .limit(10)
    : { data: [] };

  // Calculate compliance (workouts in last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentWorkouts = (workouts ?? []).filter((w: any) => w.started_at > sevenDaysAgo);

  return (
    <ClientDetail
      coachId={user.id}
      clientId={clientId}
      profile={profile as any}
      coachClient={coachClient as any}
      programs={(programs as any[]) ?? []}
      workouts={(workouts as any[]) ?? []}
      bodyStats={(bodyStats as any[]) ?? []}
      macros={macros as any}
      notes={(notes as any[]) ?? []}
      intake={intake}
      coachTasks={(coachTasks as any[]) ?? []}
      habits={(habits as any[]) ?? []}
      scheduled={(scheduled as any[]) ?? []}
      phaseWorkouts={phaseWorkouts}
      programDays={programDays}
      habitLogs={(habitLogs as any[]) ?? []}
      todaySession={(todaySession as any) ?? null}
      activeProgramId={activeProgram?.id ?? null}
      recentWorkoutCount={recentWorkouts.length}
      photos={(photoRows as any[]) ?? []}
      recentMessages={(recentMessages as any[]) ?? []}
    />
  );
}
