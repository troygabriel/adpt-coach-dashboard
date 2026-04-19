"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Target, Flame, Check, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import type { HabitWithLogs } from "@/types";

interface HabitTrackerProps {
  habits: HabitWithLogs[];
  clientId: string;
  coachId: string;
}

export function HabitTracker({ habits, clientId, coachId }: HabitTrackerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newHabit, setNewHabit] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly">("daily");
  const [targetCount, setTargetCount] = useState(1);
  const [saving, setSaving] = useState(false);

  const handleAddHabit = async () => {
    if (!newHabit.trim()) return;
    setSaving(true);
    const supabase = createClient();

    await supabase.from("habit_assignments").insert({
      coach_id: coachId,
      client_id: clientId,
      name: newHabit.trim(),
      frequency,
      target_count: targetCount,
      is_active: true,
    });

    setNewHabit("");
    setDialogOpen(false);
    setSaving(false);
    router.refresh();
  };

  const handleDeactivate = async (habitId: string) => {
    const supabase = createClient();
    await supabase
      .from("habit_assignments")
      .update({ is_active: false })
      .eq("id", habitId);
    router.refresh();
  };

  // Calculate streak for a habit (consecutive days/weeks with logs)
  const getStreak = (habit: HabitWithLogs): number => {
    if (!habit.habit_logs || habit.habit_logs.length === 0) return 0;
    const sorted = [...habit.habit_logs].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < sorted.length; i++) {
      const logDate = new Date(sorted[i].date);
      const diff = Math.floor(
        (today.getTime() - logDate.getTime()) / 86400000
      );
      if (habit.frequency === "daily" && diff <= i + 1) {
        streak++;
      } else if (habit.frequency === "weekly" && diff <= (i + 1) * 7) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  // Last 7 entries for visualization
  const getRecentLogs = (habit: HabitWithLogs) => {
    const days = 7;
    const result: boolean[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const hasLog = habit.habit_logs?.some(
        (l) => l.date === dateStr && l.count_completed >= 1
      );
      result.push(!!hasLog);
    }
    return result;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Assign habits to track alongside workouts and nutrition.
        </p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Habit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign New Habit</DialogTitle>
              <DialogDescription>
                Create a trackable habit for this client.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Habit Name
                </label>
                <Input
                  placeholder='e.g., "Drink 3L water daily"'
                  value={newHabit}
                  onChange={(e) => setNewHabit(e.target.value)}
                />
              </div>
              <div className="flex gap-4">
                <div className="space-y-2 flex-1">
                  <label className="text-sm font-medium text-foreground">
                    Frequency
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={frequency === "daily" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFrequency("daily")}
                    >
                      Daily
                    </Button>
                    <Button
                      variant={frequency === "weekly" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setFrequency("weekly")}
                    >
                      Weekly
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Target
                  </label>
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={targetCount}
                    onChange={(e) =>
                      setTargetCount(parseInt(e.target.value) || 1)
                    }
                    className="w-20"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleAddHabit} disabled={saving || !newHabit.trim()}>
                {saving ? "Assigning..." : "Assign Habit"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {habits.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Target className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">No habits assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              Assign daily or weekly habits to help this client build consistency.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {habits.map((habit) => {
            const streak = getStreak(habit);
            const recentLogs = getRecentLogs(habit);
            const completionRate =
              recentLogs.filter(Boolean).length / recentLogs.length;

            return (
              <Card key={habit.id} className="border-border bg-card">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-foreground">
                        {habit.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {habit.frequency === "daily" ? "Daily" : "Weekly"}
                        {habit.target_count > 1 &&
                          ` \u00b7 ${habit.target_count}x`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {streak > 0 && (
                        <Badge
                          variant="outline"
                          className="bg-gold/10 text-gold border-gold/30"
                        >
                          <Flame className="mr-1 h-3 w-3" />
                          {streak}
                        </Badge>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeactivate(habit.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Last 7 days visualization */}
                  <div className="flex gap-1">
                    {recentLogs.map((completed, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-7 rounded flex items-center justify-center transition-colors ${
                          completed
                            ? "bg-success/20"
                            : "bg-border/50"
                        }`}
                      >
                        {completed && (
                          <Check className="h-3.5 w-3.5 text-success" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      7 days ago
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      Today
                    </span>
                  </div>

                  {/* Completion rate */}
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full rounded-full bg-success transition-all"
                        style={{
                          width: `${completionRate * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {Math.round(completionRate * 100)}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
