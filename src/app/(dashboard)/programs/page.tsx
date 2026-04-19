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
      id, name, description, status, start_date, end_date, created_at,
      client_id,
      profiles:client_id (id, first_name),
      program_phases (id, name, phase_number, status, duration_weeks, goal)
    `)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  const { data: clients } = await supabase
    .from("coach_clients")
    .select("client_id, profiles:client_id (id, first_name)")
    .eq("coach_id", user.id)
    .eq("status", "active");

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
        programs={(programs as any[]) ?? []}
        clients={(clients as any[]) ?? []}
        coachId={user.id}
      />
    </div>
  );
}
