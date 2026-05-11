"use client";

/**
 * Daily macro target editor.
 *
 * Calories anchor the budget. Protein/carbs/fat are entered in grams (the
 * unit coaches actually program in) with sliders for tactile drag plus a
 * numeric input for precision. Each row shows derived "% of calories" and
 * "kcal" so the macro split is legible without the coach doing math in
 * their head.
 *
 * A reconciliation chip at the bottom shows summed-kcal vs target-kcal so
 * drift is obvious. Save is allowed regardless of drift — coaches sometimes
 * intentionally under/over-allocate during refeeds, deficits, etc.
 *
 * Schema unchanged: persists calories + grams to client_macros. Percentages
 * are derived only.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

export type Macros = {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
} | null;

const KCAL_PER_G = { protein: 4, carbs: 4, fat: 9 } as const;
type MacroKey = keyof typeof KCAL_PER_G;

/** Treat anything within 1% of target as "in budget". Outside that → warning. */
const DRIFT_TOLERANCE_PCT = 1;

function gramsToKcal(g: number, macro: MacroKey): number {
  return g * KCAL_PER_G[macro];
}
function pctOf(g: number, macro: MacroKey, totalKcal: number): number {
  if (totalKcal <= 0) return 0;
  return (gramsToKcal(g, macro) / totalKcal) * 100;
}
function parseNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

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

  const calNum = parseNum(calories);
  const proNum = parseNum(protein);
  const carbNum = parseNum(carbs);
  const fatNum = parseNum(fat);

  /**
   * Slider drag rebalances the other two macros proportionally so the
   * total stays at the calorie target. Typing into the numeric input
   * does NOT rebalance — precision intent.
   *
   *   delta = newKcal - oldKcal for the moved macro
   *   other two absorb -delta, split by their current kcal share
   *
   * Clamps at 0 — if the others can't give up enough kcal, the dragged
   * macro is capped so the budget isn't violated by negative grams. The
   * drift chip handles any residual rounding so coaches still see the
   * truth.
   */
  function balanceFromSlider(
    moved: MacroKey,
    newGrams: number,
  ): { protein: number; carbs: number; fat: number } {
    const current = {
      protein: proNum,
      carbs: carbNum,
      fat: fatNum,
    } as Record<MacroKey, number>;
    if (calNum <= 0) {
      // No budget set — slider edits are free.
      return { ...current, [moved]: newGrams };
    }

    const movedDeltaKcal =
      gramsToKcal(newGrams, moved) - gramsToKcal(current[moved], moved);
    if (movedDeltaKcal === 0) return { ...current, [moved]: newGrams };

    const others: MacroKey[] = (
      ["protein", "carbs", "fat"] as MacroKey[]
    ).filter((m) => m !== moved);
    const otherKcal: Record<MacroKey, number> = {
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    let otherTotal = 0;
    for (const m of others) {
      otherKcal[m] = gramsToKcal(current[m], m);
      otherTotal += otherKcal[m];
    }

    // If the others are all zero, splitting evenly is the best we can do.
    const shares: Record<MacroKey, number> = {
      protein: 0,
      carbs: 0,
      fat: 0,
    };
    if (otherTotal > 0) {
      for (const m of others) shares[m] = otherKcal[m] / otherTotal;
    } else {
      for (const m of others) shares[m] = 1 / others.length;
    }

    const next: Record<MacroKey, number> = { ...current, [moved]: newGrams };
    let absorbed = 0;
    for (const m of others) {
      const kcalChange = -movedDeltaKcal * shares[m];
      const newKcal = Math.max(0, otherKcal[m] + kcalChange);
      const newG = Math.round(newKcal / KCAL_PER_G[m]);
      next[m] = newG;
      absorbed += newKcal - otherKcal[m];
    }

    // If others bottomed out at 0 before absorbing the full delta, cap
    // the moved macro so we don't run over budget.
    const shortfall = -movedDeltaKcal - absorbed;
    if (Math.abs(shortfall) > 1 && movedDeltaKcal > 0) {
      const cappedKcal = gramsToKcal(newGrams, moved) - shortfall;
      next[moved] = Math.max(0, Math.round(cappedKcal / KCAL_PER_G[moved]));
    }

    return next;
  }

  function setMacroFromSlider(moved: MacroKey, newGrams: number) {
    const next = balanceFromSlider(moved, newGrams);
    setProtein(String(next.protein));
    setCarbs(String(next.carbs));
    setFat(String(next.fat));
  }
  const summedKcal =
    gramsToKcal(proNum, "protein") +
    gramsToKcal(carbNum, "carbs") +
    gramsToKcal(fatNum, "fat");
  const driftPct =
    calNum > 0 ? Math.abs(summedKcal - calNum) / calNum * 100 : 0;
  const driftStatus: "ok" | "warn" | "neutral" =
    calNum <= 0
      ? "neutral"
      : driftPct <= DRIFT_TOLERANCE_PCT
        ? "ok"
        : "warn";

  const save = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.from("client_macros").upsert(
      {
        client_id: clientId,
        coach_id: coachId,
        calories: calories ? Math.round(calNum) : null,
        protein_g: protein ? Math.round(proNum) : null,
        carbs_g: carbs ? Math.round(carbNum) : null,
        fat_g: fat ? Math.round(fatNum) : null,
        effective_from: new Date().toISOString().split("T")[0],
      },
      { onConflict: "client_id,effective_from" },
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

  const cancel = () => {
    setEditing(false);
    setCalories(macros?.calories?.toString() || "");
    setProtein(macros?.protein_g?.toString() || "");
    setCarbs(macros?.carbs_g?.toString() || "");
    setFat(macros?.fat_g?.toString() || "");
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
          <MacroCell
            label="Protein"
            value={macros?.protein_g ?? null}
            suffix="g"
            secondary={
              macros?.protein_g && macros?.calories
                ? `${Math.round(pctOf(macros.protein_g, "protein", macros.calories))}%`
                : undefined
            }
          />
          <MacroCell
            label="Carbs"
            value={macros?.carbs_g ?? null}
            suffix="g"
            secondary={
              macros?.carbs_g && macros?.calories
                ? `${Math.round(pctOf(macros.carbs_g, "carbs", macros.calories))}%`
                : undefined
            }
          />
          <MacroCell
            label="Fat"
            value={macros?.fat_g ?? null}
            suffix="g"
            secondary={
              macros?.fat_g && macros?.calories
                ? `${Math.round(pctOf(macros.fat_g, "fat", macros.calories))}%`
                : undefined
            }
          />
        </Card>
      </div>
    );
  }

  // Slider max = whatever fits the calorie budget (so 100% = full bar).
  // Floor at 50g so blank/zero calories doesn't lock the slider at 0.
  const sliderMaxFor = (macro: MacroKey): number => {
    if (calNum <= 0) return 50;
    return Math.max(20, Math.ceil(calNum / KCAL_PER_G[macro]));
  };
  const caloriesSet = calNum > 0;

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-medium">Daily targets</h2>

      <Card className="space-y-6 p-5">
        {/* Calories anchor */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Calories / day
            </label>
            <div className="mt-1 flex items-baseline gap-2">
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="2000"
                className="h-10 w-32 text-lg font-semibold tabular-nums"
              />
              <span className="text-xs text-muted-foreground">kcal</span>
            </div>
          </div>
          {!caloriesSet && (
            <p className="text-xs text-muted-foreground">
              Set calories to unlock macro sliders.
            </p>
          )}
        </div>

        <div className="space-y-5 border-t border-border pt-5">
          <MacroRow
            label="Protein"
            macro="protein"
            value={protein}
            onChange={setProtein}
            onSlider={(g) => setMacroFromSlider("protein", g)}
            totalKcal={calNum}
            max={sliderMaxFor("protein")}
            disabled={!caloriesSet}
          />
          <MacroRow
            label="Carbs"
            macro="carbs"
            value={carbs}
            onChange={setCarbs}
            onSlider={(g) => setMacroFromSlider("carbs", g)}
            totalKcal={calNum}
            max={sliderMaxFor("carbs")}
            disabled={!caloriesSet}
          />
          <MacroRow
            label="Fat"
            macro="fat"
            value={fat}
            onChange={setFat}
            onSlider={(g) => setMacroFromSlider("fat", g)}
            totalKcal={calNum}
            max={sliderMaxFor("fat")}
            disabled={!caloriesSet}
          />
        </div>

        {/* Reconciliation chip */}
        <div
          className={cn(
            "flex items-center justify-between rounded-md border px-3 py-2 text-xs tabular-nums",
            driftStatus === "ok" &&
              "border-border bg-muted/30 text-muted-foreground",
            driftStatus === "warn" &&
              "border-foreground/40 bg-foreground/5 text-foreground",
            driftStatus === "neutral" &&
              "border-dashed border-border text-muted-foreground",
          )}
        >
          <span className="font-medium">From macros</span>
          <span>
            {Math.round(summedKcal).toLocaleString()} /{" "}
            {caloriesSet ? calNum.toLocaleString() : "—"} kcal
            {driftStatus === "warn" && (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide">
                · {driftPct > 0 && summedKcal > calNum ? "over" : "under"} by{" "}
                {Math.round(driftPct)}%
              </span>
            )}
          </span>
        </div>

        <div className="flex justify-end gap-2">
          {hasMacros && (
            <Button variant="ghost" size="sm" onClick={cancel}>
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

function MacroRow({
  label,
  macro,
  value,
  onChange,
  onSlider,
  totalKcal,
  max,
  disabled,
}: {
  label: string;
  macro: MacroKey;
  value: string;
  /** Numeric input edits — direct set, no auto-balance. */
  onChange: (v: string) => void;
  /** Slider drag — fires the auto-balance pathway. */
  onSlider: (grams: number) => void;
  totalKcal: number;
  max: number;
  disabled: boolean;
}) {
  const grams = parseNum(value);
  const kcal = gramsToKcal(grams, macro);
  const pct = totalKcal > 0 ? pctOf(grams, macro, totalKcal) : 0;
  const sliderValue = Math.min(grams, max);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={cn(
            "tabular-nums text-xs",
            disabled ? "text-muted-foreground/50" : "text-muted-foreground",
          )}
        >
          {disabled
            ? "— · — kcal"
            : `${Math.round(pct)}% · ${Math.round(kcal).toLocaleString()} kcal`}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Slider
          value={[sliderValue]}
          onValueChange={(v) => onSlider(Math.round(v[0]))}
          min={0}
          max={max}
          step={1}
          disabled={disabled}
          className="flex-1"
          aria-label={`${label} grams`}
        />
        <div className="flex items-baseline gap-1">
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className="h-9 w-20 tabular-nums"
            placeholder="0"
          />
          <span className="text-xs text-muted-foreground">g</span>
        </div>
      </div>
    </div>
  );
}

function MacroCell({
  label,
  value,
  suffix,
  secondary,
}: {
  label: string;
  value: number | null;
  suffix?: string;
  secondary?: string;
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
      {secondary && (
        <p className="text-[11px] text-muted-foreground tabular-nums">
          {secondary}
        </p>
      )}
    </div>
  );
}
