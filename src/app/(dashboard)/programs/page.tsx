import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProgramList } from "@/components/programs/program-list";

export const dynamic = "force-dynamic";

export default async function ProgramsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: programs } = await supabase
    .from("coaching_programs")
    .select(`
      id, name, description, status, start_date, end_date, created_at, client_id,
      program_phases (id, name, phase_number, status, duration_weeks, goal)
    `)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch clients separately (no FK from coach_clients/coaching_programs to profiles)
  const { data: coachClients } = await supabase
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", user.id)
    .eq("status", "active");

  const clientIds = (coachClients ?? []).map((c: any) => c.client_id);
  const { data: profileRows } = clientIds.length > 0
    ? await supabase.from("profiles").select("id, first_name").in("id", clientIds)
    : { data: [] };

  const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

  // Attach profile to programs
  const programsWithProfiles = (programs ?? []).map((p: any) => ({
    ...p,
    profiles: profileMap.get(p.client_id) || { id: p.client_id, first_name: null },
  }));

  // Build clients list for the dropdown
  const clients = (coachClients ?? []).map((c: any) => ({
    client_id: c.client_id,
    profiles: profileMap.get(c.client_id) || { id: c.client_id, first_name: null },
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Programs</h1>
          <p className="text-sm text-muted-foreground">
            Build and assign training programs to your clients.
          </p>
        </div>
      </div>

      <ProgramList
        programs={programsWithProfiles}
        clients={clients}
        coachId={user.id}
      />
    </div>
  );
}
