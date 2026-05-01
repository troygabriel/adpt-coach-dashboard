"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Plus, MessageSquare, ChevronRight, ChevronLeft, Pencil } from "lucide-react";
import { cn, formatCurrency, pluralize } from "@/lib/utils";
import { IntakeCard, type Intake } from "./intake-card";
import { PhotosTimeline, type ProgressPhoto } from "./photos-timeline";
import { CoachTasksCard, type CoachTask } from "./coach-tasks-card";

type ClientDetailProps = {
  coachId: string;
  clientId: string;
  profile: any;
  coachClient: any;
  programs: any[];
  workouts: any[];
  bodyStats: any[];
  macros: any;
  notes: any[];
  intake: Intake | null;
  photos: ProgressPhoto[];
  coachTasks: CoachTask[];
  recentWorkoutCount: number;
};

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ClientDetail({
  coachId,
  clientId,
  profile,
  coachClient,
  programs,
  workouts,
  bodyStats,
  macros,
  notes,
  intake,
  photos,
  coachTasks,
  recentWorkoutCount,
}: ClientDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Macros editor state — start collapsed unless targets exist
  const hasMacros = !!(macros?.calories || macros?.protein_g || macros?.carbs_g || macros?.fat_g);
  const [editingMacros, setEditingMacros] = useState(!hasMacros ? false : false);
  const [calories, setCalories] = useState(macros?.calories?.toString() || "");
  const [protein, setProtein] = useState(macros?.protein_g?.toString() || "");
  const [carbs, setCarbs] = useState(macros?.carbs_g?.toString() || "");
  const [fat, setFat] = useState(macros?.fat_g?.toString() || "");
  const [savingMacros, setSavingMacros] = useState(false);

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("coach_notes").insert({
      coach_id: coachId,
      client_id: clientId,
      body: newNote.trim(),
    });
    setSavingNote(false);
    if (error) {
      toast.error("Couldn't add note", { description: error.message });
      return;
    }
    setNewNote("");
    router.refresh();
  }, [newNote, coachId, clientId, router, supabase]);

  const saveMacros = useCallback(async () => {
    setSavingMacros(true);
    const { error } = await supabase.from("client_macros").upsert(
      {
        client_id: clientId,
        coach_id: coachId,
        calories: calories ? parseInt(calories) : null,
        protein_g: protein ? parseInt(protein) : null,
        carbs_g: carbs ? parseInt(carbs) : null,
        fat_g: fat ? parseInt(fat) : null,
        effective_from: new Date().toISOString().split("T")[0],
      },
      { onConflict: "client_id,effective_from" }
    );
    setSavingMacros(false);
    if (error) {
      toast.error("Couldn't save targets", { description: error.message });
      return;
    }
    toast.success("Nutrition targets saved");
    setEditingMacros(false);
    router.refresh();
  }, [calories, protein, carbs, fat, clientId, coachId, router, supabase]);

  const latestWeight = bodyStats?.[0];
  const latestWeightLbs = latestWeight?.weight_kg
    ? (latestWeight.weight_kg * 2.205).toFixed(1)
    : null;
  const totalWorkouts = workouts?.length ?? 0;
  const activeProgram = programs.find((p: any) => p.status === "active");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={() => router.push("/clients")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Avatar className="h-12 w-12 shrink-0">
            <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
              {getInitials(profile?.first_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight">
                {profile?.first_name || "Client"}
              </h1>
              <Badge variant="outline" className="capitalize">
                {coachClient.status}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              {profile?.email}
              {coachClient.monthly_rate_cents
                ? ` · ${formatCurrency(coachClient.monthly_rate_cents)}/mo`
                : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0">
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Message
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="photos">Photos</TabsTrigger>
        </TabsList>

        {/* SUMMARY */}
        <TabsContent value="summary" className="space-y-6 pt-4">
          {/* Slim stat strip — matches dashboard pattern */}
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
            <StatCell label="Workouts (7d)" value={recentWorkoutCount} />
            <StatCell label="Total workouts" value={totalWorkouts} />
            <StatCell
              label="Latest weight"
              value={latestWeightLbs ? `${latestWeightLbs}` : "—"}
              suffix={latestWeightLbs ? "lbs" : undefined}
            />
          </div>

          <IntakeCard intake={intake} />

          <CoachTasksCard
            clientId={clientId}
            coachId={coachId}
            tasks={coachTasks}
          />

          {/* Current program */}
          <section>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">Current program</h3>
            {activeProgram ? (
              <Card
                className="flex cursor-pointer flex-row items-center justify-between p-4 transition-colors hover:bg-muted/40"
                onClick={() => router.push(`/programs/${activeProgram.id}`)}
              >
                <div>
                  <p className="font-medium">{activeProgram.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pluralize(activeProgram.program_phases?.length ?? 0, "phase")}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Card>
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No active program assigned.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => router.push("/programs")}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Assign program
                </Button>
              </div>
            )}
          </section>

          {/* Recent activity */}
          <section>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">Recent activity</h3>
            {workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
            ) : (
              <div className="rounded-xl border border-border bg-card">
                {workouts.slice(0, 5).map((w: any, i: number) => (
                  <div
                    key={w.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3",
                      i !== Math.min(4, workouts.length - 1) && "border-b border-border"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {w.title || "Workout"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.started_at).toLocaleDateString()}
                      </p>
                    </div>
                    {w.ended_at && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {Math.round(
                          (new Date(w.ended_at).getTime() -
                            new Date(w.started_at).getTime()) /
                            60000
                        )}
                        {" min"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Nutrition targets — collapsed by default if not set */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Nutrition targets</h3>
              {hasMacros && !editingMacros && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 text-xs"
                  onClick={() => setEditingMacros(true)}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>

            {!hasMacros && !editingMacros ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">No targets set.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setEditingMacros(true)}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Set targets
                </Button>
              </div>
            ) : !editingMacros ? (
              <Card className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border p-0 sm:grid-cols-4">
                <MacroCell label="Calories" value={macros?.calories} />
                <MacroCell label="Protein" value={macros?.protein_g} suffix="g" />
                <MacroCell label="Carbs" value={macros?.carbs_g} suffix="g" />
                <MacroCell label="Fat" value={macros?.fat_g} suffix="g" />
              </Card>
            ) : (
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
                        setEditingMacros(false);
                        setCalories(macros?.calories?.toString() || "");
                        setProtein(macros?.protein_g?.toString() || "");
                        setCarbs(macros?.carbs_g?.toString() || "");
                        setFat(macros?.fat_g?.toString() || "");
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                  <Button size="sm" onClick={saveMacros} disabled={savingMacros}>
                    {savingMacros ? "Saving..." : "Save targets"}
                  </Button>
                </div>
              </Card>
            )}
          </section>

          {/* Coach notes */}
          <section>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">Coach notes</h3>
            <div className="mb-3 flex gap-2">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this client..."
                className="min-h-[60px] resize-none"
              />
              <Button
                onClick={addNote}
                disabled={savingNote || !newNote.trim()}
                size="sm"
                className="self-end"
              >
                {savingNote ? "Saving..." : "Add"}
              </Button>
            </div>
            {notes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            ) : (
              <div className="rounded-xl border border-border bg-card">
                {notes.map((note: any, i: number) => (
                  <div
                    key={note.id}
                    className={cn(
                      "px-4 py-3",
                      i !== notes.length - 1 && "border-b border-border"
                    )}
                  >
                    <p className="text-sm">{note.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* PROGRAMS */}
        <TabsContent value="programs" className="space-y-3 pt-4">
          <Button variant="outline" onClick={() => router.push("/programs")}>
            <Plus className="mr-2 h-4 w-4" /> Create new program
          </Button>
          {programs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
          ) : (
            programs.map((prog: any) => (
              <Card
                key={prog.id}
                className="flex cursor-pointer flex-row items-center justify-between p-4 transition-colors hover:bg-muted/40"
                onClick={() => router.push(`/programs/${prog.id}`)}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium">{prog.name}</p>
                    <Badge variant={prog.status === "active" ? "default" : "secondary"}>
                      {prog.status}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {pluralize(prog.program_phases?.length ?? 0, "phase")} · Created{" "}
                    {new Date(prog.created_at).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Card>
            ))
          )}
        </TabsContent>

        {/* PROGRESS */}
        <TabsContent value="progress" className="space-y-6 pt-4">
          <section>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">Weight history</h3>
            {bodyStats.length === 0 ? (
              <p className="text-sm text-muted-foreground">No body stats logged yet.</p>
            ) : (
              <div className="rounded-xl border border-border bg-card">
                {bodyStats.slice(0, 10).map((stat: any, i: number) => (
                  <div
                    key={stat.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5",
                      i !== Math.min(9, bodyStats.length - 1) && "border-b border-border"
                    )}
                  >
                    <span className="text-sm text-muted-foreground">
                      {new Date(stat.date).toLocaleDateString()}
                    </span>
                    <div className="flex gap-4 tabular-nums">
                      {stat.weight_kg && (
                        <span className="text-sm font-medium">
                          {(stat.weight_kg * 2.205).toFixed(1)} lbs
                        </span>
                      )}
                      {stat.body_fat_pct && (
                        <span className="text-sm text-muted-foreground">
                          {stat.body_fat_pct}% BF
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold tracking-tight">Workout history</h3>
            {workouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
            ) : (
              <div className="rounded-xl border border-border bg-card">
                {workouts.slice(0, 10).map((w: any, i: number) => (
                  <div
                    key={w.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-2.5",
                      i !== Math.min(9, workouts.length - 1) && "border-b border-border"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {w.title || "Workout"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(w.started_at).toLocaleDateString()}
                      </p>
                    </div>
                    {w.ended_at && (
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {Math.round(
                          (new Date(w.ended_at).getTime() -
                            new Date(w.started_at).getTime()) /
                            60000
                        )}
                        {" min"}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </TabsContent>

        {/* PHOTOS */}
        <TabsContent value="photos" className="space-y-6 pt-4">
          <PhotosTimeline photos={photos} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-1 bg-background p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-3xl font-semibold tracking-tight tabular-nums">
        {value}
        {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}

function MacroCell({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number | null | undefined;
  suffix?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 bg-background p-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-semibold tabular-nums">
        {value ?? "—"}
        {value && suffix && (
          <span className="ml-0.5 text-xs font-normal text-muted-foreground">{suffix}</span>
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
    <div className="space-y-1">
      <label className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <Input
        type="number"
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9"
      />
    </div>
  );
}
