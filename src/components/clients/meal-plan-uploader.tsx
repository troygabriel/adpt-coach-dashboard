"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ExternalLink, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/patterns/confirm-dialog";

const MAX_BYTES = 20 * 1024 * 1024;

export type MealPlanRow = {
  id: string;
  title: string;
  storage_path: string;
  file_size_bytes: number | null;
  uploaded_at: string;
};

interface Props {
  clientId: string;
  plans: MealPlanRow[];
}

export function MealPlanUploader({ clientId, plans }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] =
    useState<MealPlanRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  function pickFile(picked: File | null) {
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.type !== "application/pdf") {
      toast.error("Must be a PDF");
      return;
    }
    if (picked.size > MAX_BYTES) {
      toast.error("Too large", { description: "Max 20MB." });
      return;
    }
    setFile(picked);
    if (!title) setTitle(picked.name.replace(/\.pdf$/i, ""));
  }

  async function upload() {
    if (!file) return;
    setUploading(true);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("clientId", clientId);
    fd.append("title", title.trim() || file.name.replace(/\.pdf$/i, ""));

    const res = await fetch("/api/meal-plans/upload", {
      method: "POST",
      body: fd,
    });
    setUploading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Upload failed", {
        description: body.error ?? `HTTP ${res.status}`,
      });
      return;
    }

    toast.success("Meal plan uploaded");
    setFile(null);
    setTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    router.refresh();
  }

  async function open(plan: MealPlanRow) {
    setOpening(plan.id);
    const res = await fetch(`/api/meal-plans/${plan.id}/url`);
    setOpening(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Couldn't get download link", {
        description: body.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    const { url } = (await res.json()) as { url: string };
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function deletePlan(plan: MealPlanRow) {
    setDeleting(true);
    const res = await fetch(`/api/meal-plans/${plan.id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error("Delete failed", {
        description: body.error ?? `HTTP ${res.status}`,
      });
      return;
    }
    setPendingDelete(null);
    toast.success("Meal plan removed");
    router.refresh();
  }

  return (
    <>
      <Card className="space-y-4 p-5">
        <div>
          <h2 className="text-base font-medium">Upload a meal plan</h2>
          <p className="text-xs text-muted-foreground">
            PDF up to 20MB. Clients can open and download from their Meals
            tab on mobile.
          </p>
        </div>

        <div className="space-y-2.5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="meal-plan-title">
              Title
            </label>
            <Input
              id="meal-plan-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Cut Phase 2 — Week 1"
              disabled={uploading}
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-border file:bg-muted file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-muted/70"
              disabled={uploading}
            />
            <Button
              onClick={upload}
              disabled={!file || uploading}
              className="shrink-0"
            >
              {uploading ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              Upload
            </Button>
          </div>

          {file && (
            <p className="text-xs text-muted-foreground">
              Selected: {file.name} ({formatBytes(file.size)})
            </p>
          )}
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-base font-medium">Uploaded plans</h2>
        {plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No meal plans uploaded yet.
          </p>
        ) : (
          <div className="divide-y divide-border">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center gap-3 py-2.5"
              >
                <FileText
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-muted-foreground"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{plan.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(plan.file_size_bytes)} ·{" "}
                    {new Date(plan.uploaded_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-0.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => open(plan)}
                    disabled={opening === plan.id}
                  >
                    {opening === plan.id ? (
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                    ) : (
                      <ExternalLink className="mr-1 h-3 w-3" />
                    )}
                    Open
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => setPendingDelete(plan)}
                    aria-label="Delete meal plan"
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(o) => {
          if (!o) setPendingDelete(null);
        }}
        title="Delete meal plan?"
        description={
          pendingDelete
            ? `“${pendingDelete.title}” will be removed for the client. This can't be undone.`
            : ""
        }
        actionLabel="Delete"
        destructive
        pending={deleting}
        onConfirm={() => {
          if (pendingDelete) void deletePlan(pendingDelete);
        }}
      />
    </>
  );
}

function formatBytes(b: number | null): string {
  if (b == null) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}
