import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarMonth } from "@/components/calendar/calendar-month";

export const dynamic = "force-dynamic";

function parseMonth(s: string | undefined): { year: number; month: number } {
  if (s) {
    const m = /^(\d{4})-(\d{2})$/.exec(s);
    if (m) {
      const y = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      if (y >= 1900 && y < 3000 && mm >= 1 && mm <= 12) {
        return { year: y, month: mm - 1 };
      }
    }
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function isoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function ClientMirrorCalendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ month?: string }>;
}) {
  const { clientId } = await params;
  const sp = await searchParams;
  const { year, month } = parseMonth(sp.month);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - firstOfMonth.getDay());
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41);
  const gridStartIso = isoDate(gridStart);
  const gridEndIso = isoDate(gridEnd);

  // Fire all month-window queries in parallel — five independent reads.
  const [
    { data: tasks },
    { data: clientProfile },
    { data: sessions },
    { data: scheduled },
    { data: stats },
    { data: habits },
  ] = await Promise.all([
    supabase
      .from("coach_tasks")
      .select("id, client_id, scheduled_for, task_type, title, manually_completed_at")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .gte("scheduled_for", gridStartIso)
      .lte("scheduled_for", gridEndIso)
      .order("scheduled_for", { ascending: true }),
    supabase.from("profiles").select("first_name").eq("id", clientId).single(),
    supabase
      .from("workout_sessions")
      .select("started_at")
      .eq("user_id", clientId)
      .gte("started_at", `${gridStartIso}T00:00:00`)
      .lte("started_at", `${gridEndIso}T23:59:59`),
    supabase
      .from("scheduled_workouts")
      .select("scheduled_date, source_type")
      .eq("client_id", clientId)
      .gte("scheduled_date", gridStartIso)
      .lte("scheduled_date", gridEndIso),
    supabase
      .from("body_stats")
      .select("date")
      .eq("client_id", clientId)
      .gte("date", gridStartIso)
      .lte("date", gridEndIso),
    // habit_logs needs assignment_id resolution by client + date range.
    // Schema lookup is keyed by client_id directly per migration.
    supabase
      .from("habit_logs")
      .select("date, completed")
      .eq("client_id", clientId)
      .eq("completed", true)
      .gte("date", gridStartIso)
      .lte("date", gridEndIso),
  ]);

  const clientName = clientProfile?.first_name ?? null;

  const workoutDates = new Set(
    (sessions ?? []).map((s) => s.started_at.slice(0, 10) as string),
  );
  const scheduledDates = new Set(
    (scheduled ?? [])
      .filter((s) => s.source_type !== "rest")
      .map((s) => s.scheduled_date as string),
  );
  const restDates = new Set(
    (scheduled ?? [])
      .filter((s) => s.source_type === "rest")
      .map((s) => s.scheduled_date as string),
  );
  const weighInDates = new Set(
    (stats ?? []).map((s) => s.date as string),
  );
  const habitDates = new Set(
    (habits ?? []).map((h) => h.date as string),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Mirrors what{" "}
          <span className="text-foreground">{clientName ?? "this client"}</span>{" "}
          sees in the mobile Calendar tab.
        </p>
      </div>
      <CalendarMonth
        year={year}
        month={month}
        tasks={(tasks ?? []).map((t) => ({
          id: t.id,
          clientId: t.client_id,
          scheduledFor: t.scheduled_for,
          taskType: t.task_type,
          title: t.title,
          completed: !!t.manually_completed_at,
          clientFirstName: clientName,
        }))}
        clients={[]}
        clientFilter={clientId}
        hideClientFilter
        basePath={`/clients/${clientId}/calendar`}
        workoutDates={workoutDates}
        scheduledDates={scheduledDates}
        restDates={restDates}
        habitDates={habitDates}
        weighInDates={weighInDates}
      />
    </div>
  );
}
