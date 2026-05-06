"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export type Macros = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
} | null;

export function MacroTargets({
  coachId,
  clientId,
  macros,
}: {
  coachId: string;
  clientId: string;
  macros: Macros;
}) {
  const router = useRouter();
  const hasMacros = !!(
    macros?.calories ||
    macros?.protein_g ||
    macros?.carbs_g ||
    macros?.fat_g
  );

  const [editing, setEditing] = useState(!hasMacros);
  const [calories, setCalories] = useState(macros?.calories?.toString() || "");
  const [protein, setProtein] = useState(macros?.protein_g?.toString() || "");
  const [carbs, setCarbs] = useState(macros?.carbs_g?.toString() || "");
  const [fat, setFat] = useState(macros?.fat_g?.toString() || "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("client_macros").upsert(
      {
        client_id: clientId,
        coach_id: coachId,
        calories: calories ? parseInt(calories, 10) : null,
        protein_g: protein ? parseInt(protein, 10) : null,
        carbs_g: carbs ? parseInt(carbs, 10) : null,
        fat_g: fat ? parseInt(fat, 10) : null,
        effective_from: new Date().toISOString().split("T")[0],
      },
      { onConflict: "client_id,effective_from" }
    );
    setSaving(false);
    if (error) {
      toast.error("Couldn't save targets", { description: error.message });
      return;
    }
    toast.success("Nutrition targets saved");
    setEditing(false);
    router.refresh();
  };

  if (!hasMacros && !editing) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
        <p className="text-sm font-medium">No targets set</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Set daily macro targets and they&rsquo;ll show up on the client&rsquo;s
          home screen.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setEditing(true)}
        >
          <Plus aria-hidden="true" className="mr-1.5 h-3.5 w-3.5" />
          Set targets
        </Button>
      </div>
    );
  }

  if (!editing) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Daily targets</h2>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-xs"
            onClick={() => setEditing(true)}
          >
            <Pencil aria-hidden="true" className="h-3 w-3" />
            Edit
          </Button>
        </div>
        <Card className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border p-0 sm:grid-cols-4">
          <MacroCell label="Calories" value={macros?.calories ?? null} />
          <MacroCell label="Protein" value={macros?.protein_g ?? null} suffix="g" />
          <MacroCell label="Carbs" value={macros?.carbs_g ?? null} suffix="g" />
          <MacroCell label="Fat" value={macros?.fat_g ?? null} suffix="g" />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium">Daily targets</h2>
      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MacroInput label="Calories" value={calories} onChange={setCalories} />
          <MacroInput label="Protein (g)" value={protein} onChange={setProtein} />
          <MacroInput label="Carbs (g)" value={carbs} onChange={setCarbs} />
          <MacroInput label="Fat (g)" value={fat} onChange={setFat} />
        </div>
        <div className="flex justify-end gap-2">
          {hasMacros && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(false);
                setCalories(macros?.calories?.toString() || "");
                setProtein(macros?.protein_g?.toString() || "");
                setCarbs(macros?.carbs_g?.toString() || "");
                setFat(macros?.fat_g?.toString() || "");
              }}
            >
              Cancel
            </Button>
          )}
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save targets"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function MacroCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null;
  suffix?: string;
}) {
  return (
    <div className="bg-card p-3.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tabular-nums">
        {value != null ? value.toLocaleString() : "—"}
        {suffix && value != null && (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">
            {suffix}
          </span>
        )}
      </p>
    </div>
  );
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 tabular-nums"
      />
    </div>
  );
}
