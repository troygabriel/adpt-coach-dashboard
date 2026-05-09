import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { TemplateEditor } from "@/components/check-ins/template-editor";
import { parseQuestions, type TemplateFrequency } from "@/lib/check-in-templates";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: row } = await supabase
    .from("check_in_templates")
    .select("id, name, frequency, is_default, questions")
    .eq("id", id)
    .eq("coach_id", user.id)
    .maybeSingle();

  if (!row) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" className="h-8 w-8">
          <Link href="/check-ins/templates" aria-label="Back to templates">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Templates
        </p>
      </div>

      <TemplateEditor
        templateId={row.id}
        initial={{
          name: row.name,
          frequency: row.frequency as TemplateFrequency,
          is_default: row.is_default,
          questions: parseQuestions(row.questions),
        }}
      />
    </div>
  );
}
