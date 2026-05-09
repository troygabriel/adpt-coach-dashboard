import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Skips a "create modal" step — we land the coach straight inside the
// editor of a fresh row. If they navigate away without saving anything,
// the row stays as "Untitled template" and they can delete it from the
// list. Same pattern Notion / Linear use.
export default async function NewTemplatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data, error } = await supabase
    .from("check_in_templates")
    .insert({
      coach_id: user.id,
      name: "",
      frequency: "weekly",
      questions: [],
      is_default: false,
    })
    .select("id")
    .single();

  if (error || !data) redirect("/check-ins/templates");
  redirect(`/check-ins/templates/${data.id}`);
}
