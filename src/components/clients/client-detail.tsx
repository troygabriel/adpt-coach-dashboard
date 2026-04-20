"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, MessageSquare, ChevronRight } from "lucide-react";

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
  recentWorkoutCount: number;
};

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
  recentWorkoutCount,
}: ClientDetailProps) {
  const router = useRouter();
  const supabase = createClient();
  const [newNote, setNewNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Macro editor state
  const [calories, setCalories] = useState(macros?.calories?.toString() || "");
  const [protein, setProtein] = useState(macros?.protein_g?.toString() || "");
  const [carbs, setCarbs] = useState(macros?.carbs_g?.toString() || "");
  const [fat, setFat] = useState(macros?.fat_g?.toString() || "");
  const [savingMacros, setSavingMacros] = useState(false);

  const addNote = useCallback(async () => {
    if (!newNote.trim()) return;
    setSavingNote(true);
    await supabase.from("coach_notes").insert({
      coach_id: coachId,
      client_id: clientId,
      body: newNote.trim(),
    });
    setNewNote("");
    setSavingNote(false);
    router.refresh();
  }, [newNote, coachId, clientId, router, supabase]);

  const saveMacros = useCallback(async () => {
    setSavingMacros(true);
    await supabase.from("client_macros").upsert({
      client_id: clientId,
      coach_id: coachId,
      calories: calories ? parseInt(calories) : null,
      protein_g: protein ? parseInt(protein) : null,
      carbs_g: carbs ? parseInt(carbs) : null,
      fat_g: fat ? parseInt(fat) : null,
      effective_from: new Date().toISOString().split("T")[0],
    }, { onConflict: "client_id,effective_from" });
    setSavingMacros(false);
    router.refresh();
  }, [calories, protein, carbs, fat, clientId, coachId, router, supabase]);

  const latestWeight = bodyStats?.[0];
  const totalWorkouts = workouts?.length ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{profile?.first_name || "Client"}</h1>
          <p className="text-sm text-muted-foreground">
            {profile?.email} · {coachClient.status} · ${((coachClient.monthly_rate_cents || 0) / 100).toFixed(0)}/mo
          </p>
        </div>
        <Button variant="outline" size="sm">
          <MessageSquare className="mr-2 h-4 w-4" /> Message
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="programs">Programs</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
        </TabsList>

        {/* SUMMARY TAB */}
        <TabsContent value="summary" className="space-y-6 pt-4">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{recentWorkoutCount}</p>
              <p className="text-xs text-muted-foreground">Workouts (7d)</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">{totalWorkouts}</p>
              <p className="text-xs text-muted-foreground">Total Workouts</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-2xl font-bold">
                {latestWeight?.weight_kg ? `${(latestWeight.weight_kg * 2.205).toFixed(0)}` : "—"}
              </p>
              <p className="text-xs text-muted-foreground">Weight (lbs)</p>
            </Card>
          </div>

          {/* Current Program */}
          <div>
            <h3 className="font-semibold mb-2">Current Program</h3>
            {programs.filter((p: any) => p.status === "active").length > 0 ? (
              programs.filter((p: any) => p.status === "active").map((prog: any) => (
                <Card
                  key={prog.id}
                  className="p-4 cursor-pointer hover:bg-accent/30"
                  onClick={() => router.push(`/programs/${prog.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{prog.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {prog.program_phases?.length || 0} phases
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-4">
                <p className="text-sm text-muted-foreground">No active program</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => router.push("/programs")}
                >
                  <Plus className="mr-1 h-3 w-3" /> Assign Program
                </Button>
              </Card>
            )}
          </div>

          {/* Recent Activity */}
          <div>
            <h3 className="font-semibold mb-2">Recent Activity</h3>
            {workouts.slice(0, 5).map((w: any) => (
              <div key={w.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <p className="text-sm font-medium">{w.title || "Workout"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.started_at).toLocaleDateString()}
                  </p>
                </div>
                {w.ended_at && (
                  <Badge variant="outline" className="text-xs">
                    {Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)} min
                  </Badge>
                )}
              </div>
            ))}
            {workouts.length === 0 && (
              <p className="text-sm text-muted-foreground">No workouts logged yet</p>
            )}
          </div>

          {/* Macros */}
          <div>
            <h3 className="font-semibold mb-2">Nutrition Targets</h3>
            <Card className="p-4 space-y-3">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground">Calories</label>
                  <Input value={calories} onChange={(e) => setCalories(e.target.value)} type="number" className="h-8 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Protein (g)</label>
                  <Input value={protein} onChange={(e) => setProtein(e.target.value)} type="number" className="h-8 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Carbs (g)</label>
                  <Input value={carbs} onChange={(e) => setCarbs(e.target.value)} type="number" className="h-8 mt-1" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Fat (g)</label>
                  <Input value={fat} onChange={(e) => setFat(e.target.value)} type="number" className="h-8 mt-1" />
                </div>
              </div>
              <Button size="sm" onClick={saveMacros} disabled={savingMacros}>
                {savingMacros ? "Saving..." : "Save Targets"}
              </Button>
            </Card>
          </div>

          {/* Coach Notes */}
          <div>
            <h3 className="font-semibold mb-2">Coach Notes</h3>
            <div className="flex gap-2 mb-3">
              <Textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Add a note about this client..."
                className="min-h-[60px]"
              />
              <Button onClick={addNote} disabled={savingNote || !newNote.trim()} size="sm" className="self-end">
                Add
              </Button>
            </div>
            {notes.map((note: any) => (
              <div key={note.id} className="py-2 border-b last:border-0">
                <p className="text-sm">{note.body}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(note.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* PROGRAMS TAB */}
        <TabsContent value="programs" className="space-y-4 pt-4">
          <Button
            variant="outline"
            onClick={() => router.push("/programs")}
          >
            <Plus className="mr-2 h-4 w-4" /> Create New Program
          </Button>
          {programs.map((prog: any) => (
            <Card
              key={prog.id}
              className="p-4 cursor-pointer hover:bg-accent/30"
              onClick={() => router.push(`/programs/${prog.id}`)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{prog.name}</p>
                    <Badge variant={prog.status === "active" ? "default" : "secondary"}>
                      {prog.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {prog.program_phases?.length || 0} phases · Created {new Date(prog.created_at).toLocaleDateString()}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Card>
          ))}
          {programs.length === 0 && (
            <p className="text-sm text-muted-foreground">No programs assigned yet.</p>
          )}
        </TabsContent>

        {/* PROGRESS TAB */}
        <TabsContent value="progress" className="space-y-6 pt-4">
          {/* Weight trend */}
          <div>
            <h3 className="font-semibold mb-2">Weight History</h3>
            {bodyStats.length > 0 ? (
              <Card className="p-4">
                <div className="space-y-2">
                  {bodyStats.slice(0, 10).map((stat: any) => (
                    <div key={stat.id} className="flex items-center justify-between py-1 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">
                        {new Date(stat.date).toLocaleDateString()}
                      </span>
                      <div className="flex gap-4">
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
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No body stats logged yet.</p>
            )}
          </div>

          {/* Workout volume */}
          <div>
            <h3 className="font-semibold mb-2">Workout History</h3>
            {workouts.length > 0 ? (
              <Card className="p-4">
                <div className="space-y-2">
                  {workouts.slice(0, 10).map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between py-1 border-b last:border-0">
                      <div>
                        <p className="text-sm font-medium">{w.title || "Workout"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(w.started_at).toLocaleDateString()}
                        </p>
                      </div>
                      {w.ended_at && (
                        <span className="text-xs text-muted-foreground">
                          {Math.round((new Date(w.ended_at).getTime() - new Date(w.started_at).getTime()) / 60000)} min
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground">No workouts logged yet.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
