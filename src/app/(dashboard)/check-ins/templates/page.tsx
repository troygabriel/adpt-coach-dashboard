import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  FREQUENCY_LABELS,
  parseQuestions,
  type TemplateFrequency,
} from "@/lib/check-in-templates";
import { TemplatesList } from "@/components/check-ins/templates-list";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: rows } = await supabase
    .from("check_in_templates")
    .select("id, name, frequency, is_default, questions, updated_at")
    .eq("coach_id", user.id)
    .order("updated_at", { ascending: false });

  const templates = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    frequency: r.frequency as TemplateFrequency,
    is_default: r.is_default,
    question_count: parseQuestions(r.questions).length,
    updated_at: r.updated_at,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Check-in templates
          </h1>
          <p className="text-sm text-muted-foreground">
            Author the weekly questionnaire your clients fill out. One can be
            marked default — that&apos;s the one new clients receive.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/check-ins/templates/new">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            New template
          </Link>
        </Button>
      </div>

      <TemplatesList
        templates={templates}
        frequencyLabels={FREQUENCY_LABELS}
      />
    </div>
  );
}
