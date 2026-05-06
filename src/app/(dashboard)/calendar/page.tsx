import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarMonth } from "@/components/calendar/calendar-month";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ month?: string; client?: string }>;

function parseMonth(s: string | undefined): { year: number; month: number } {
  // month is 0-indexed in JS Date semantics. URL is YYYY-MM (1-indexed).
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

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const { year, month } = parseMonth(params.month);
  const clientFilter = params.client ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  // Window: include trailing days of prev month + leading days of next month
  // so the 6-row grid is always populated.
  const firstOfMonth = new Date(year, month, 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(1 - firstOfMonth.getDay()); // back up to Sunday
  const gridEnd = new Date(gridStart);
  gridEnd.setDate(gridStart.getDate() + 41); // 6 weeks

  const startISO = gridStart.toISOString().slice(0, 10);
  const endISO = gridEnd.toISOString().slice(0, 10);

  let tasksQuery = supabase
    .from("coach_tasks")
    .select("id, client_id, scheduled_for, task_type, title, manually_completed_at")
    .eq("coach_id", user.id)
    .gte("scheduled_for", startISO)
    .lte("scheduled_for", endISO)
    .order("scheduled_for", { ascending: true });

  if (clientFilter) tasksQuery = tasksQuery.eq("client_id", clientFilter);

  const [{ data: tasks }, { data: roster }] = await Promise.all([
    tasksQuery,
    supabase
      .from("coach_clients")
      .select("client_id")
      .eq("coach_id", user.id)
      .in("status", ["active", "paused"]),
  ]);

  const clientIds = (roster ?? []).map((r) => r.client_id);
  const { data: profiles } = clientIds.length
    ? await supabase
        .from("profiles")
        .select("id, first_name")
        .in("id", clientIds)
    : { data: [] };

  const clientMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.first_name as string | null])
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Tasks you&apos;ve scheduled for clients across the month.
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
          clientFirstName: clientMap.get(t.client_id) ?? null,
        }))}
        clients={(profiles ?? []).map((p) => ({
          id: p.id,
          firstName: p.first_name ?? null,
        }))}
        clientFilter={clientFilter}
      />
    </div>
  );
}
