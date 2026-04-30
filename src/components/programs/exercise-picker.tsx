"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Check } from "lucide-react";
import { cn, pluralize } from "@/lib/utils";

type Exercise = {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
  primary_muscles: string[] | null;
};

const MUSCLE_GROUPS: { id: string; label: string; muscles: string[] }[] = [
  { id: "chest", label: "Chest", muscles: ["chest"] },
  { id: "back", label: "Back", muscles: ["lats", "middle back", "lower back", "traps"] },
  { id: "shoulders", label: "Shoulders", muscles: ["shoulders"] },
  { id: "arms", label: "Arms", muscles: ["biceps", "triceps", "forearms"] },
  { id: "core", label: "Core", muscles: ["abdominals"] },
  { id: "legs", label: "Legs", muscles: ["quadriceps", "hamstrings", "glutes", "calves"] },
];

type ExercisePickerProps = {
  onSelect: (exercise: { name: string; id?: string }) => void;
};

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [allExercises, setAllExercises] = useState<Exercise[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<Map<string, Exercise>>(new Map());

  // Fetch on first open, then cache for the session
  useEffect(() => {
    if (!open || loaded) return;
    let cancelled = false;
    setLoading(true);
    const supabase = createClient();
    supabase
      .from("exercises")
      .select("id, name, category, equipment, primary_muscles")
      .eq("is_public", true)
      .order("name")
      .limit(500)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setAllExercises(data as Exercise[]);
        setLoaded(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, loaded]);

  const filtered = useMemo(() => {
    let result = allExercises;
    if (activeGroup) {
      const muscles = MUSCLE_GROUPS.find((g) => g.id === activeGroup)?.muscles ?? [];
      const allowed = new Set(muscles);
      result = result.filter((e) => e.primary_muscles?.some((m) => allowed.has(m)));
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) => e.name.toLowerCase().includes(q));
    }
    return result;
  }, [allExercises, activeGroup, search]);

  const toggleSelect = useCallback((ex: Exercise) => {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(ex.id)) next.delete(ex.id);
      else next.set(ex.id, ex);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    setSelected(new Map());
    setSearch("");
    setActiveGroup(null);
  }, []);

  const addAll = useCallback(() => {
    selected.forEach((ex) => onSelect({ name: ex.name, id: ex.id }));
    reset();
    setOpen(false);
  }, [selected, onSelect, reset]);

  const addCustom = useCallback(() => {
    if (!search.trim()) return;
    onSelect({ name: search.trim() });
    reset();
    setOpen(false);
  }, [search, onSelect, reset]);

  // Reset selection when dialog closes via overlay/X
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-muted-foreground"
        >
          <Search className="h-4 w-4" />
          Add exercise...
        </Button>
      </DialogTrigger>
      <DialogContent className="flex h-[85vh] max-w-3xl flex-col gap-0 p-0 sm:rounded-2xl">
        <DialogHeader className="space-y-3 border-b border-border px-5 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            Add exercises
          </DialogTitle>

          {/* Search */}
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search exercises..."
              className="pl-9"
            />
          </div>

          {/* Muscle group chips — same set as mobile */}
          <div className="flex flex-wrap gap-1.5">
            <Chip active={!activeGroup} onClick={() => setActiveGroup(null)}>
              All
            </Chip>
            {MUSCLE_GROUPS.map((g) => (
              <Chip
                key={g.id}
                active={activeGroup === g.id}
                onClick={() => setActiveGroup(activeGroup === g.id ? null : g.id)}
              >
                {g.label}
              </Chip>
            ))}
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Loading exercises...
            </p>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-sm font-medium text-foreground">No exercises match.</p>
              {search.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={addCustom}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add &quot;{search.trim()}&quot; as custom exercise
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {filtered.map((ex) => {
                const isSelected = selected.has(ex.id);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => toggleSelect(ex)}
                    className={cn(
                      "group relative flex flex-col gap-1 rounded-xl border p-3 text-left transition-all",
                      isSelected
                        ? "border-foreground bg-foreground/5"
                        : "border-border bg-card hover:border-foreground/30 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-tight">
                        {ex.name}
                      </span>
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
                          isSelected
                            ? "border-foreground bg-foreground"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {isSelected && (
                          <Check
                            className="h-3 w-3 text-background"
                            strokeWidth={3}
                          />
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1">
                      {ex.equipment && (
                        <span className="text-[10px] capitalize text-muted-foreground">
                          {ex.equipment}
                        </span>
                      )}
                      {ex.equipment && ex.primary_muscles?.[0] && (
                        <span className="text-[10px] text-muted-foreground/60">·</span>
                      )}
                      {ex.primary_muscles?.[0] && (
                        <span className="text-[10px] capitalize text-muted-foreground">
                          {ex.primary_muscles[0]}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: selection summary + bulk add */}
        {selected.size > 0 && (
          <footer className="flex items-center justify-between gap-3 border-t border-border bg-background px-5 py-3">
            <p className="text-sm text-muted-foreground">
              {pluralize(selected.size, "exercise")} selected
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelected(new Map())}
              >
                Clear
              </Button>
              <Button size="sm" onClick={addAll}>
                Add {selected.size}
              </Button>
            </div>
          </footer>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 rounded-full border px-3.5 text-xs font-medium transition-colors",
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border bg-background text-muted-foreground hover:bg-muted/40 hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}
