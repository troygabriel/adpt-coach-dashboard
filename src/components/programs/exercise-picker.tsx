"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Search } from "lucide-react";

type Exercise = {
  id: string;
  name: string;
  category: string | null;
  equipment: string | null;
  primary_muscles: string[] | null;
};

type ExercisePickerProps = {
  onSelect: (exercise: { name: string; id?: string }) => void;
};

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchExercises = useCallback(async (query: string) => {
    setLoading(true);
    const supabase = createClient();
    let q = supabase
      .from("exercises")
      .select("id, name, category, equipment, primary_muscles")
      .eq("is_public", true)
      .order("name")
      .limit(30);

    if (query.trim()) {
      q = q.ilike("name", `%${query.trim()}%`);
    }

    const { data } = await q;
    if (data) setExercises(data as Exercise[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) fetchExercises("");
  }, [open, fetchExercises]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (open) fetchExercises(search);
    }, 200);
    return () => clearTimeout(timer);
  }, [search, open, fetchExercises]);

  const handleSelect = (exercise: Exercise) => {
    onSelect({ name: exercise.name, id: exercise.id });
    setOpen(false);
    setSearch("");
  };

  const handleCustom = () => {
    if (search.trim()) {
      onSelect({ name: search.trim() });
      setOpen(false);
      setSearch("");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground">
          <Search className="h-4 w-4" />
          Add exercise...
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search exercises..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-72">
            {loading && <div className="py-3 text-center text-sm text-muted-foreground">Searching...</div>}
            {!loading && exercises.length === 0 && search.trim() && (
              <CommandEmpty>
                <button
                  onClick={handleCustom}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-accent cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add &quot;{search.trim()}&quot; as custom exercise
                </button>
              </CommandEmpty>
            )}
            {!loading && exercises.length === 0 && !search.trim() && (
              <div className="py-3 text-center text-sm text-muted-foreground">Type to search exercises...</div>
            )}
            <CommandGroup>
              {exercises.map((exercise) => (
                <CommandItem
                  key={exercise.id}
                  value={exercise.name}
                  onSelect={() => handleSelect(exercise)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col gap-0.5 flex-1">
                    <span className="font-medium">{exercise.name}</span>
                    <div className="flex items-center gap-1.5">
                      {exercise.equipment && (
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {exercise.equipment}
                        </Badge>
                      )}
                      {exercise.primary_muscles?.slice(0, 2).map((m) => (
                        <Badge key={m} variant="secondary" className="text-[10px] h-4 px-1">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {search.trim() && exercises.length > 0 && (
              <CommandGroup heading="Custom">
                <CommandItem onSelect={handleCustom} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Add &quot;{search.trim()}&quot;
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
