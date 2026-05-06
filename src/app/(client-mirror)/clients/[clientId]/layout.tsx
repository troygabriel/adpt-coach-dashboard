import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientMirrorShell } from "@/components/layout/client-mirror-shell";

export default async function ClientMirrorLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || (profile.role !== "coach" && profile.role !== "admin")) {
    redirect("/dashboard");
  }

  // Verify the coach actually owns this relationship before rendering the mirror.
  const { data: relationship } = await supabase
    .from("coach_clients")
    .select("client_id, status")
    .eq("coach_id", user.id)
    .eq("client_id", clientId)
    .maybeSingle();
  if (!relationship) notFound();

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("first_name")
    .eq("id", clientId)
    .single();

  return (
    <ClientMirrorShell
      clientId={clientId}
      clientName={clientProfile?.first_name ?? null}
    >
      {children}
    </ClientMirrorShell>
  );
}
