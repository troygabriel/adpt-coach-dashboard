"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronRight, MessageSquare, Plus } from "lucide-react";
import { cn, formatCurrency, pluralize } from "@/lib/utils";
import { IntakeCard, type Intake } from "./intake-card";
import { CoachTasksCard, type CoachTask } from "./coach-tasks-card";
import { HabitsCard, type HabitAssignment } from "./habits-card";
import { ComplianceRow } from "./compliance-row";
import { ClientHomeMirror } from "./client-home-mirror";
import { ClientActivityRail } from "./client-activity-rail";
import { MacroTargets } from "./macro-targets";

type ScheduledRow = {
  id: string;
  client_id: string;
  coach_id: string;
  scheduled_date: string;
  source_type: "phase_workout" | "template" | "rest";
  phase_workout_id: string | null;
  template_id: string | null;
  notes: string | null;
  completed: boolean;
};

type PhaseWorkoutLite = {
  id: string;
  name: string;
  day_number: number;
  exercises: unknown;
  /** Optional context — populated by the page-level fetch when phase metadata
   * is available so the home mirror can show "Phase 1 · Day 2". */
  phase_id?: string;
  phase_name?: string;
  phase_number?: number;
};

type PhotoRow = {
  id: string;
  created_at: string;
  pose: string | null;
};

type MessageRow = {
  id: string;
  created_at: string;
  content: string;
  sender_id: string;
};

type HabitLog = {
  assignment_id: string;
  date: string;
  completed: boolean;
};

type WorkoutSessionLite = {
  id: string;
  started_at: string;
  ended_at: string | null;
  title: string | null;
};

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
  coachTasks: CoachTask[];
  habits: HabitAssignment[];
  scheduled: ScheduledRow[];
  phaseWorkouts: PhaseWorkoutLite[];
  programDays: { day_number: number }[];
  habitLogs: HabitLog[];
  todaySession: WorkoutSessionLite | null;
  activeProgramId: string | null;
  recentWorkoutCount: number;
  photos: PhotoRow[];
  recentMessages: MessageRow[];
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
  coachTasks,
  habits,
  scheduled,
  phaseWorkouts,
  programDays,
  habitLogs,
  todaySession,
  activeProgramId,
  recentWorkoutCount,
  photos,
  recentMessages,
}: ClientDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

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

  const latestWeight = bodyStats?.[0];
  const latestWeightLbs = latestWeight?.weight_kg
    ? (latestWeight.weight_kg * 2.205).toFixed(1)
    : null;
  const totalWorkouts = workouts?.length ?? 0;
  const activeProgram = programs.find((p: any) => p.status === "active");

  // Map page-level workout list to the rail's input shape. Body stats and
  // workouts already come from page; we just slice the most recent for
  // display.
  const ratlWeighIns = (bodyStats ?? []).slice(0, 10).map((s: any) => ({
    date: s.date,
    created_at: s.created_at ?? s.date,
    weight_kg: s.weight_kg,
    body_fat_pct: s.body_fat_pct,
  }));
  const railWorkouts = (workouts ?? []).slice(0, 10);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
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
        <Button
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => router.push(`/messages?client=${clientId}`)}
        >
          <MessageSquare className="mr-1.5 h-4 w-4" />
          Message
        </Button>
      </div>

      {/* Top: Trainerize-style two-column — main mirror left, activity rail right */}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ClientHomeMirror
          clientId={clientId}
          clientName={profile?.first_name ?? null}
          scheduled={scheduled}
          phaseWorkouts={phaseWorkouts.map((w) => ({
            id: w.id,
            name: w.name,
            day_number: w.day_number,
            exercise_count: Array.isArray(w.exercises) ? w.exercises.length : 0,
            phase_id: w.phase_id ?? "",
            phase_name: w.phase_name ?? "",
            phase_number: w.phase_number ?? 0,
            exercises: Array.isArray(w.exercises) ? (w.exercises as { name: string; sets?: number | null; reps?: string | number | null; rir?: number | null }[]) : [],
          }))}
          habits={habits}
          habitLogs={habitLogs}
          coachTasks={coachTasks}
          macros={macros}
          programId={activeProgramId}
          recentWorkouts={workouts}
          bodyStats={bodyStats}
        />
        <ClientActivityRail
          clientId={clientId}
          workouts={railWorkouts}
          weighIns={ratlWeighIns}
          photos={photos}
          messages={recentMessages}
        />
      </div>

      <div className="space-y-6">
          <ComplianceRow
            scheduled={scheduled}
            workouts={workouts}
            programDays={programDays}
          />

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

          <HabitsCard
            clientId={clientId}
            coachId={coachId}
            habits={habits}
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

          {/* Nutrition targets — single source of truth via MacroTargets.
              Same component used on the Meals page so coaches can't drift
              between two editors. */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold tracking-tight">Nutrition targets</h3>
            <MacroTargets
              coachId={coachId}
              clientId={clientId}
              macros={macros}
            />
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
      </div>
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

