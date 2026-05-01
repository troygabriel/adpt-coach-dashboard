"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Camera, Scale, UtensilsCrossed, ListChecks } from "lucide-react";

export type CoachTask = {
  id: string;
  coach_id: string;
  client_id: string;
  scheduled_for: string;
  task_type: "photos" | "body_stats" | "macros" | "custom";
  title: string;
  description: string | null;
  manually_completed_at: string | null;
  created_at: string;
};

type TaskType = CoachTask["task_type"];

const TYPE_DEFAULTS: Record<TaskType, { title: string; icon: typeof Camera }> = {
  photos: { title: "Take progress photos", icon: Camera },
  body_stats: { title: "Track body stats", icon: Scale },
  macros: { title: "Hit nutrition target", icon: UtensilsCrossed },
  custom: { title: "", icon: ListChecks },
};

const TYPE_LABELS: Record<TaskType, string> = {
  photos: "Progress photos",
  body_stats: "Body stats",
  macros: "Nutrition target",
  custom: "Custom",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(d: string): string {
  return new Date(d + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

interface Props {
  clientId: string;
  coachId: string;
  tasks: CoachTask[];
}

export function CoachTasksCard({ clientId, coachId, tasks }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  const today = todayISO();
  const upcoming = useMemo(
    () => tasks.filter((t) => t.scheduled_for >= today),
    [tasks, today]
  );

  async function handleDelete(id: string) {
    const { error } = await supabase.from("coach_tasks").delete().eq("id", id);
    if (error) {
      toast.error("Couldn't delete task", { description: error.message });
      return;
    }
    toast.success("Task removed");
    router.refresh();
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Scheduled tasks</h2>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Schedule
        </Button>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No upcoming tasks. Schedule one to show up on the client&apos;s home tab.
        </p>
      ) : (
        <div className="divide-y">
          {upcoming.map((task) => {
            const Icon = TYPE_DEFAULTS[task.task_type].icon;
            return (
              <div key={task.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/40">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateLabel(task.scheduled_for)} · {TYPE_LABELS[task.task_type]}
                    </p>
                  </div>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(task.id)}
                  title="Remove task"
                  aria-label="Remove task"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      <ScheduleTaskDialog
        open={open}
        onClose={() => setOpen(false)}
        clientId={clientId}
        coachId={coachId}
      />
    </Card>
  );
}

function ScheduleTaskDialog({
  open,
  onClose,
  clientId,
  coachId,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  coachId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [type, setType] = useState<TaskType>("photos");
  const [date, setDate] = useState<string>(todayISO());
  const [title, setTitle] = useState<string>(TYPE_DEFAULTS.photos.title);
  const [description, setDescription] = useState<string>("");
  const [titleEdited, setTitleEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  function reset() {
    setType("photos");
    setDate(todayISO());
    setTitle(TYPE_DEFAULTS.photos.title);
    setDescription("");
    setTitleEdited(false);
    setSaving(false);
    onClose();
  }

  function handleTypeChange(next: TaskType) {
    setType(next);
    if (!titleEdited) setTitle(TYPE_DEFAULTS[next].title);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Title required");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("coach_tasks").insert({
      coach_id: coachId,
      client_id: clientId,
      scheduled_for: date,
      task_type: type,
      title: title.trim(),
      description: description.trim() || null,
    });
    setSaving(false);
    if (error) {
      toast.error("Couldn't schedule", { description: error.message });
      return;
    }
    toast.success("Task scheduled");
    router.refresh();
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && reset()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Schedule task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select value={type} onValueChange={(v) => handleTypeChange(v as TaskType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="photos">Progress photos</SelectItem>
                <SelectItem value="body_stats">Body stats</SelectItem>
                <SelectItem value="macros">Nutrition target</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={todayISO()}
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleEdited(true);
              }}
              placeholder={
                type === "custom" ? "e.g. Walk 30 minutes" : TYPE_DEFAULTS[type].title
              }
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description <span className="text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Anything extra to show under the title"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={reset}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
