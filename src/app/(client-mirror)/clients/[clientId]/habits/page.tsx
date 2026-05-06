import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { HabitsCard, type HabitAssignment } from "@/components/clients/habits-card";

export const dynamic = "force-dynamic";

export default async function ClientHabitsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: habits } = await supabase
    .from("habit_assignments")
    .select("*")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Goals &amp; habits
        </h1>
        <p className="text-sm text-muted-foreground">
          Daily habits this client checks off in their app.
        </p>
      </div>
      <HabitsCard
        clientId={clientId}
        coachId={user.id}
        habits={(habits as HabitAssignment[]) ?? []}
      />
    </div>
  );
}
