"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

type Exercise = {
  id: string;
  name: string;
  category: string | null;
};

type ExercisePickerProps = {
  onSelect: (exercise: { name: string; id?: string }) => void;
};

export function ExercisePicker({ onSelect }: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("exercises")
      .select("id, name, category")
      .order("name")
      .then(({ data }) => {
        if (data) setExercises(data as Exercise[]);
      });
  }, []);

  const filtered = exercises.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase())
  );

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
      <PopoverContent className="w-80 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search exercises..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  onClick={handleCustom}
                  className="flex w-full items-center gap-2 px-4 py-3 text-sm hover:bg-accent cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add "{search.trim()}" as custom exercise
                </button>
              ) : (
                <p className="py-3 text-center text-sm">Type to search...</p>
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.slice(0, 20).map((exercise) => (
                <CommandItem
                  key={exercise.id}
                  value={exercise.name}
                  onSelect={() => handleSelect(exercise)}
                  className="cursor-pointer"
                >
                  <div className="flex flex-col">
                    <span>{exercise.name}</span>
                    {exercise.category && (
                      <span className="text-xs text-muted-foreground">{exercise.category}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {search.trim() && filtered.length > 0 && (
              <CommandGroup heading="Custom">
                <CommandItem onSelect={handleCustom} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{search.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
