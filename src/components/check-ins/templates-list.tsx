"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Star, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/patterns/chip";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";
import type { TemplateFrequency } from "@/lib/check-in-templates";

type Row = {
  id: string;
  name: string;
  frequency: TemplateFrequency;
  is_default: boolean;
  question_count: number;
  updated_at: string;
};

interface Props {
  templates: Row[];
  frequencyLabels: Record<TemplateFrequency, string>;
}

export function TemplatesList({ templates, frequencyLabels }: Props) {
  const router = useRouter();
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (templates.length === 0) {
    return (
      <Card className="space-y-3 p-8 text-center">
        <p className="text-sm font-medium">No templates yet</p>
        <p className="text-xs text-muted-foreground">
          Build one to start sending consistent check-ins to your roster.
        </p>
      </Card>
    );
  }

  async function setDefault(id: string) {
    const supabase = createClient();
    // Single-row default. Clear all, then mark the chosen one. Two-step is
    // fine here — RLS guarantees coach scoping and there's no concurrent
    // editor on a coach's own templates.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("check_in_templates")
      .update({ is_default: false })
      .eq("coach_id", user.id);
    const { error } = await supabase
      .from("check_in_templates")
      .update({ is_default: true })
      .eq("id", id);
    if (error) {
      toast.error("Couldn't set default", { description: error.message });
      return;
    }
    toast.success("Default template updated");
    router.refresh();
  }

  async function deleteTemplate(id: string) {
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("check_in_templates")
      .delete()
      .eq("id", id);
    setDeleting(false);
    if (error) {
      toast.error("Couldn't delete", { description: error.message });
      return;
    }
    setPendingDelete(null);
    toast.success("Template deleted");
    router.refresh();
  }

  return (
    <>
      <Card className="divide-y divide-border">
        {templates.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
          >
            <Link
              href={`/check-ins/templates/${t.id}`}
              className="min-w-0 flex-1"
            >
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium">
                  {t.name || "Untitled template"}
                </p>
                {t.is_default && (
                  <Chip className="gap-1 text-[10px] uppercase tracking-wide">
                    <Star aria-hidden="true" className="h-2.5 w-2.5" />
                    Default
                  </Chip>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {frequencyLabels[t.frequency]} ·{" "}
                {t.question_count}{" "}
                {t.question_count === 1 ? "question" : "questions"}
              </p>
            </Link>

            <div className="flex shrink-0 gap-1">
              {!t.is_default && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => setDefault(t.id)}
                  title="Make default"
                >
                  Make default
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() =>
                  setPendingDelete({ id: t.id, name: t.name || "Untitled template" })
                }
                aria-label="Delete template"
              >
                <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Delete template?"
        description={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed. Past check-ins that used it stay intact.`
            : ""
        }
        actionLabel="Delete"
        destructive
        pending={deleting}
        onConfirm={() => {
          if (pendingDelete) void deleteTemplate(pendingDelete.id);
        }}
      />
    </>
  );
}
