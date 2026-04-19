import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CheckInQueue } from "@/components/check-ins/check-in-queue";
import type { CheckInWithClient } from "@/types";

export const dynamic = "force-dynamic";

export default async function CheckInsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch check-ins (no FK join to profiles — do it separately)
  const { data: checkIns } = await supabase
    .from("check_ins")
    .select("*, check_in_photos (*)")
    .eq("coach_id", user.id)
    .order("submitted_at", { ascending: false });

  // Fetch profiles for all client IDs in check-ins
  const clientIds = [...new Set((checkIns ?? []).map((c: any) => c.client_id))];
  const { data: profileRows } = clientIds.length > 0
    ? await supabase.from("profiles").select("id, first_name, goal").in("id", clientIds)
    : { data: [] };

  const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));

  const checkInsWithProfiles = (checkIns ?? []).map((c: any) => ({
    ...c,
    profiles: profileMap.get(c.client_id) || { id: c.client_id, first_name: null, goal: null },
  }));

  // Fetch body stats for trend data
  const { data: bodyStats } = await supabase
    .from("body_stats")
    .select("*")
    .order("date", { ascending: true });

  // Fetch coach notes
  const { data: coachNotes } = await supabase
    .from("coach_notes")
    .select("*")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch habit assignments with recent logs
  const { data: habits } = await supabase
    .from("habit_assignments")
    .select("*, habit_logs (*)")
    .eq("coach_id", user.id)
    .eq("active", true);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Check-ins</h1>
        <p className="text-muted-foreground">
          Review client progress, leave feedback, and manage everything in one place.
        </p>
      </div>

      <CheckInQueue
        checkIns={(checkInsWithProfiles as CheckInWithClient[]) || []}
        bodyStats={bodyStats || []}
        coachNotes={coachNotes || []}
        habits={habits || []}
        coachId={user.id}
      />
    </div>
  );
}
