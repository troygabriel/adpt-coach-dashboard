"use client";

import { useState } from "react";
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
import { Plus, X, Pencil, Pause, Play } from "lucide-react";

export type HabitAssignment = {
  id: string;
  coach_id: string;
  client_id: string;
  name: string;
  description: string | null;
  frequency: "daily" | "weekly";
  target_value: number | null;
  unit: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

interface Props {
  clientId: string;
  coachId: string;
  habits: HabitAssignment[];
}

const PRESET_HABITS = [
  { name: "Hit daily macros", target: null as number | null, unit: null as string | null },
  { name: "Drink water", target: 8, unit: "glasses" },
  { name: "10,000 steps", target: 10000, unit: "steps" },
  { name: "8 hours of sleep", target: 8, unit: "hours" },
  { name: "Stretch / mobility", target: null, unit: null },
  { name: "Log your food", target: null, unit: null },
];

export function HabitsCard({ clientId, coachId, habits }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HabitAssignment | null>(null);

  async function deleteHabit(id: string) {
    const { error } = await supabase
      .from("habit_assignments")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Couldn't remove habit", { description: error.message });
      return;
    }
    toast.success("Habit removed");
    router.refresh();
  }

  async function toggleActive(habit: HabitAssignment) {
    const { error } = await supabase
      .from("habit_assignments")
      .update({ active: !habit.active })
      .eq("id", habit.id);
    if (error) {
      toast.error("Couldn't update habit", { description: error.message });
      return;
    }
    toast.success(habit.active ? "Habit paused" : "Habit resumed");
    router.refresh();
  }

  const active = habits.filter((h) => h.active);
  const paused = habits.filter((h) => !h.active);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium">Daily habits</h2>
          <p className="text-xs text-muted-foreground">
            Show up on the client&apos;s home tab as a daily checklist.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Add habit
        </Button>
      </div>

      {active.length === 0 && paused.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No habits assigned yet. Add one and the client sees it on their home
          tab tomorrow morning.
        </p>
      ) : (
        <>
          {active.length > 0 && (
            <div className="divide-y">
              {active.map((h) => (
                <HabitRow
                  key={h.id}
                  habit={h}
                  onEdit={() => {
                    setEditing(h);
                    setDialogOpen(true);
                  }}
                  onDelete={() => deleteHabit(h.id)}
                  onToggleActive={() => toggleActive(h)}
                />
              ))}
            </div>
          )}
          {paused.length > 0 && (
            <div className="space-y-1.5">
              <p className="pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Paused
              </p>
              <div className="divide-y opacity-60">
                {paused.map((h) => (
                  <HabitRow
                    key={h.id}
                    habit={h}
                    onEdit={() => {
                      setEditing(h);
                      setDialogOpen(true);
                    }}
                    onDelete={() => deleteHabit(h.id)}
                    onToggleActive={() => toggleActive(h)}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <HabitDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setEditing(null);
        }}
        clientId={clientId}
        coachId={coachId}
        editing={editing}
      />
    </Card>
  );
}

function HabitRow({
  habit,
  onEdit,
  onDelete,
  onToggleActive,
}: {
  habit: HabitAssignment;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}) {
  const targetSummary =
    habit.target_value && habit.unit
      ? `${habit.target_value} ${habit.unit}`
      : habit.target_value
      ? String(habit.target_value)
      : null;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{habit.name}</p>
        <p className="text-xs text-muted-foreground">
          {habit.frequency === "daily" ? "Daily" : "Weekly"}
          {targetSummary ? ` · ${targetSummary}` : ""}
          {habit.description ? ` · ${habit.description}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 gap-0.5">
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onToggleActive}
          aria-label={habit.active ? "Pause habit" : "Resume habit"}
          title={habit.active ? "Pause" : "Resume"}
        >
          {habit.active ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={onEdit}
          aria-label="Edit habit"
          title="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          aria-label="Delete habit"
          title="Delete"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function HabitDialog({
  open,
  onClose,
  clientId,
  coachId,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  clientId: string;
  coachId: string;
  editing: HabitAssignment | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [frequency, setFrequency] = useState<"daily" | "weekly">(
    editing?.frequency ?? "daily"
  );
  const [target, setTarget] = useState<string>(
    editing?.target_value != null ? String(editing.target_value) : ""
  );
  const [unit, setUnit] = useState<string>(editing?.unit ?? "");
  const [saving, setSaving] = useState(false);

  // Re-sync local state when the editing target changes (or dialog reopens
  // for "Add").
  if (open && editing && name === "" && editing.name !== "") {
    setName(editing.name);
    setDescription(editing.description ?? "");
    setFrequency(editing.frequency);
    setTarget(editing.target_value != null ? String(editing.target_value) : "");
    setUnit(editing.unit ?? "");
  }

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Habit name is required");
      return;
    }
    setSaving(true);
    const payload = {
      coach_id: coachId,
      client_id: clientId,
      name: trimmed,
      description: description.trim() || null,
      frequency,
      target_value: target.trim() ? Number(target) : null,
      unit: unit.trim() || null,
      active: true,
    };

    const { error } = editing
      ? await supabase
          .from("habit_assignments")
          .update(payload)
          .eq("id", editing.id)
      : await supabase.from("habit_assignments").insert(payload);

    setSaving(false);
    if (error) {
      toast.error("Couldn't save habit", { description: error.message });
      return;
    }
    toast.success(editing ? "Habit updated" : "Habit added");
    resetAndClose();
    router.refresh();
  }

  function resetAndClose() {
    setName("");
    setDescription("");
    setFrequency("daily");
    setTarget("");
    setUnit("");
    onClose();
  }

  function applyPreset(preset: (typeof PRESET_HABITS)[number]) {
    setName(preset.name);
    setTarget(preset.target != null ? String(preset.target) : "");
    setUnit(preset.unit ?? "");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetAndClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit habit" : "Add a habit"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!editing && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Quick start
              </p>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_HABITS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs hover:bg-muted/70"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="habit-name">
              Name
            </label>
            <Input
              id="habit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Drink water"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Frequency</label>
              <Select
                value={frequency}
                onValueChange={(v) => setFrequency(v as "daily" | "weekly")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium" htmlFor="habit-target">
                Target (optional)
              </label>
              <Input
                id="habit-target"
                type="number"
                inputMode="numeric"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="e.g. 8"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="habit-unit">
              Unit (optional)
            </label>
            <Input
              id="habit-unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="e.g. glasses, minutes, steps"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="habit-desc">
              Description (optional)
            </label>
            <Textarea
              id="habit-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Anything the client should know"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={resetAndClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? "Saving…" : editing ? "Save changes" : "Add habit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
