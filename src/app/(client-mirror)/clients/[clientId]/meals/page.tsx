import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MacroTargets, type Macros } from "@/components/clients/macro-targets";

export const dynamic = "force-dynamic";

export default async function ClientMealsPage({
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

  const { data: macros } = await supabase
    .from("client_macros")
    .select("calories, protein_g, carbs_g, fat_g, effective_from")
    .eq("client_id", clientId)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meal plan</h1>
        <p className="text-sm text-muted-foreground">
          Daily macro targets the client sees on the Meals tab.
        </p>
      </div>
      <MacroTargets
        coachId={user.id}
        clientId={clientId}
        macros={macros as Macros}
      />
    </div>
  );
}
