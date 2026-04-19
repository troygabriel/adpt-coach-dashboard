import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientTable } from "@/components/clients/client-table";
import type { ClientWithProfile } from "@/types";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in");

  // Fetch coach_clients, then fetch profiles separately (no direct FK to profiles)
  const { data: coachClients } = await supabase
    .from("coach_clients")
    .select("*")
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch profiles for all client IDs
  const clientIds = (coachClients ?? []).map((c) => c.client_id);
  const { data: profileRows } = clientIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, first_name, goal")
        .in("id", clientIds)
    : { data: [] };

  const profileMap = new Map((profileRows ?? []).map((p: any) => [p.id, p]));
  const clients = (coachClients ?? []).map((c) => ({
    ...c,
    profiles: profileMap.get(c.client_id) || { id: c.client_id, first_name: null, goal: null },
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clients</h1>
        <p className="text-muted-foreground">Manage your coaching clients.</p>
      </div>

      <ClientTable
        clients={(clients as ClientWithProfile[]) || []}
        coachId={user.id}
      />
    </div>
  );
}
