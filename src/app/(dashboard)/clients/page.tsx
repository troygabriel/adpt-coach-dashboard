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

  const { data: clients } = await supabase
    .from("coach_clients")
    .select(`
      *,
      profiles:client_id (
        id,
        first_name,
        goal
      )
    `)
    .eq("coach_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        <p className="text-muted-foreground">Manage your coaching clients.</p>
      </div>

      <ClientTable
        clients={(clients as ClientWithProfile[]) || []}
        coachId={user.id}
      />
    </div>
  );
}
