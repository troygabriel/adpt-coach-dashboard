import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { ProgramBuilder } from "@/components/programs/program-builder";

export default async function ProgramDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: program } = await supabase
    .from("coaching_programs")
    .select(`
      id, coach_id, client_id, name, description, status, start_date, end_date,
      profiles:client_id (id, first_name),
      program_phases (
        id, name, description, phase_number, duration_weeks, goal, status,
        phase_workouts (id, day_number, name, exercises, duration_minutes, notes)
      )
    `)
    .eq("id", id)
    .eq("coach_id", user.id)
    .single();

  if (!program) notFound();

  return <ProgramBuilder program={program as any} />;
}
