import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MacroTargets, type Macros } from "@/components/clients/macro-targets";
import {
  MealPlanUploader,
  type MealPlanRow,
} from "@/components/clients/meal-plan-uploader";

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

  const [macrosRes, plansRes] = await Promise.all([
    supabase
      .from("client_macros")
      .select("calories, protein_g, carbs_g, fat_g, effective_from")
      .eq("client_id", clientId)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("meal_plans")
      .select("id, title, storage_path, file_size_bytes, uploaded_at")
      .eq("client_id", clientId)
      .eq("coach_id", user.id)
      .order("uploaded_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meal plan</h1>
        <p className="text-sm text-muted-foreground">
          Daily macro targets and any meal-plan PDFs the client can open in
          their Meals tab.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Macro targets
        </h2>
        <MacroTargets
          coachId={user.id}
          clientId={clientId}
          macros={macrosRes.data as Macros}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Meal-plan documents
        </h2>
        <MealPlanUploader
          clientId={clientId}
          plans={(plansRes.data ?? []) as MealPlanRow[]}
        />
      </section>
    </div>
  );
}
