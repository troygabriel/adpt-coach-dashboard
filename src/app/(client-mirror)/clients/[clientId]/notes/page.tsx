import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotesList } from "@/components/clients/notes-list";

export const dynamic = "force-dynamic";

export default async function ClientNotesPage({
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

  const { data: notes } = await supabase
    .from("coach_notes")
    .select("id, body, created_at")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
        <p className="text-sm text-muted-foreground">
          Private notes only you see.
        </p>
      </div>
      <NotesList
        coachId={user.id}
        clientId={clientId}
        notes={
          (notes ?? []).map((n) => ({
            id: n.id,
            body: n.body,
            createdAt: n.created_at,
          })) as { id: string; body: string; createdAt: string }[]
        }
      />
    </div>
  );
}
