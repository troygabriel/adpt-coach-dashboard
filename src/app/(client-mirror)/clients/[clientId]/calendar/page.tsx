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

  const [{ data: tasks }, { data: clientProfile }] = await Promise.all([
    supabase
      .from("coach_tasks")
      .select("id, client_id, scheduled_for, task_type, title, manually_completed_at")
      .eq("coach_id", user.id)
      .eq("client_id", clientId)
      .gte("scheduled_for", isoDate(gridStart))
      .lte("scheduled_for", isoDate(gridEnd))
      .order("scheduled_for", { ascending: true }),
    supabase.from("profiles").select("first_name").eq("id", clientId).single(),
  ]);

  const clientName = clientProfile?.first_name ?? null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Tasks scheduled for{" "}
          <span className="text-foreground">{clientName ?? "this client"}</span>.
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
      />
    </div>
  );
}
