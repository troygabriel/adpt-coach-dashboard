import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm, type CoachSettings } from "@/components/settings/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: coach } = await supabase
    .from("coaches")
    .select(
      "id, display_name, business_name, bio, specialties, is_accepting_clients"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (!coach) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your coaching profile and roster availability.
        </p>
      </div>
      <SettingsForm
        initial={
          {
            display_name: coach.display_name ?? "",
            business_name: coach.business_name ?? "",
            bio: coach.bio ?? "",
            specialties: (coach.specialties as string[] | null) ?? [],
            is_accepting_clients: !!coach.is_accepting_clients,
          } satisfies CoachSettings
        }
      />
    </div>
  );
}
