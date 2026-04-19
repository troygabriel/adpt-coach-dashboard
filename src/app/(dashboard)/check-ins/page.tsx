import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckInQueue } from "@/components/check-ins/check-in-queue";
import type { CheckInWithClient } from "@/types";

export default async function CheckInsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch check-ins with client profiles and photos
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select(`
      *,
      profiles:client_id (
        id,
        first_name,
        goal
      ),
      check_in_photos (*),
      coach_clients!inner (
        status,
        monthly_rate_cents
      )
    `)
    .eq("coach_id", user.id)
    .order("submitted_at", { ascending: false });

  // Fetch body stats for trend data (last 12 weeks per client)
  const { data: bodyStats } = await supabase
    .from("body_stats")
    .select("*")
    .order("date", { ascending: true });

  // Fetch coach notes for all clients
  const { data: coachNotes } = await supabase
    .from("coach_notes")
    .select("*")
    .eq("coach_id", user.id)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  // Fetch habit assignments with recent logs
  const { data: habits } = await supabase
    .from("habit_assignments")
    .select(`
      *,
      habit_logs (*)
    `)
    .eq("coach_id", user.id)
    .eq("is_active", true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Check-ins</h1>
        <p className="text-muted-foreground">
          Review client progress, leave feedback, and manage everything in one place.
        </p>
      </div>

      <CheckInQueue
        checkIns={(checkIns as CheckInWithClient[]) || []}
        bodyStats={bodyStats || []}
        coachNotes={coachNotes || []}
        habits={habits || []}
        coachId={user.id}
      />
    </div>
  );
}
