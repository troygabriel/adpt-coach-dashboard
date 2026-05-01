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
      recentWorkoutCount={recentWorkouts.length}
    />
  );
}
