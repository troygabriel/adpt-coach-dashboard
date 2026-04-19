"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  Save,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Camera,
  Dumbbell,
  Apple,
  Moon,
  Zap,
  Brain,
  Heart,
  MessageSquare,
  Trophy,
  AlertTriangle,
  Pin,
  StickyNote,
  Target,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CoachNotesPanel } from "./coach-notes-panel";
import { PhotoComparison } from "./photo-comparison";
import { WeightTrendChart } from "./weight-trend-chart";
import { HabitTracker } from "./habit-tracker";
import { createClient } from "@/lib/supabase/client";
import type {
  CheckInWithClient,
  CheckInResponses,
  CheckInFlag,
  BodyStat,
  CoachNote,
  HabitWithLogs,
} from "@/types";

interface CheckInDetailProps {
  checkIn: CheckInWithClient;
  flags: CheckInFlag[];
  bodyStats: BodyStat[];
  coachNotes: CoachNote[];
  habits: HabitWithLogs[];
  coachId: string;
}

export function CheckInDetail({
  checkIn,
  flags,
  bodyStats,
  coachNotes,
  habits,
  coachId,
}: CheckInDetailProps) {
  const router = useRouter();
  const responses = checkIn.responses as CheckInResponses | null;
  const [feedback, setFeedback] = useState(checkIn.coach_feedback || "");
  const [internalNotes, setInternalNotes] = useState(checkIn.coach_notes || "");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  const handleSaveFeedback = async (markReviewed: boolean) => {
    setSaving(true);
    const supabase = createClient();

    const update: Record<string, unknown> = {
      coach_feedback: feedback,
      coach_notes: internalNotes,
    };

    if (markReviewed) {
      update.status = "reviewed";
      update.reviewed_at = new Date().toISOString();
    }

    await supabase.from("check_ins").update(update).eq("id", checkIn.id);

    setSaving(false);
    router.refresh();
  };

  return (
    <Card className="border-border border-t-0 rounded-t-none bg-secondary">
      <CardContent className="p-4 md:p-6">
        {/* Flags banner */}
        {flags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {flags.map((flag, i) => (
              <div
                key={i}
                className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm ${
                  flag.severity === "critical"
                    ? "bg-destructive/10 text-destructive"
                    : flag.severity === "warning"
                      ? "bg-accent/10 text-accent"
                      : "bg-info/10 text-info"
                }`}
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>{flag.message}</span>
                {flag.detail && (
                  <span className="text-xs opacity-70">
                    &mdash; {flag.detail}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Tab navigation — everything in one place */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="photos">
              Photos
              {checkIn.check_in_photos && checkIn.check_in_photos.length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1 text-xs">
                  {checkIn.check_in_photos.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="notes">
              Notes & Instructions
              {coachNotes.filter((n) => n.is_pinned).length > 0 && (
                <Badge variant="secondary" className="ml-1.5 h-5 px-1 text-xs">
                  <Pin className="h-2.5 w-2.5" />
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="habits">Habits</TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Wellness Metrics */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Wellness Scores
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <ScoreRow
                    icon={<Dumbbell className="h-4 w-4" />}
                    label="Training"
                    value={responses?.training_adherence}
                  />
                  <ScoreRow
                    icon={<Apple className="h-4 w-4" />}
                    label="Nutrition"
                    value={responses?.nutrition_adherence}
                  />
                  <ScoreRow
                    icon={<Zap className="h-4 w-4" />}
                    label="Energy"
                    value={responses?.energy_level}
                  />
                  <ScoreRow
                    icon={<Moon className="h-4 w-4" />}
                    label="Sleep"
                    value={responses?.sleep_quality}
                    suffix={
                      responses?.sleep_hours
                        ? `${responses.sleep_hours}hrs`
                        : undefined
                    }
                  />
                  <ScoreRow
                    icon={<Brain className="h-4 w-4" />}
                    label="Stress"
                    value={responses?.stress_level}
                    invertColor
                  />
                  <ScoreRow
                    icon={<Activity className="h-4 w-4" />}
                    label="Hunger"
                    value={responses?.hunger_level}
                  />
                </CardContent>
              </Card>

              {/* Body Stats */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Body Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {responses?.weight_kg != null && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Weight
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-semibold tabular-nums text-foreground">
                          {responses.weight_kg.toFixed(1)} kg
                        </span>
                        <WeightDelta
                          current={responses.weight_kg}
                          stats={bodyStats}
                        />
                      </div>
                    </div>
                  )}
                  {responses?.weight_trend &&
                    responses.weight_trend.length > 0 && (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          Daily weigh-ins
                        </span>
                        <div className="mt-1 flex gap-1">
                          {responses.weight_trend.map((w, i) => (
                            <div
                              key={i}
                              className="flex-1 rounded bg-primary/10 px-1 py-0.5 text-center text-xs tabular-nums text-primary"
                            >
                              {w.toFixed(1)}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {responses?.measurements && (
                    <div className="space-y-1.5 pt-2">
                      <Separator />
                      <span className="text-xs text-muted-foreground">
                        Measurements
                      </span>
                      {Object.entries(responses.measurements).map(
                        ([key, val]) =>
                          val != null && (
                            <div
                              key={key}
                              className="flex justify-between text-sm"
                            >
                              <span className="capitalize text-muted-foreground">
                                {key}
                              </span>
                              <span className="tabular-nums text-foreground">
                                {val} cm
                              </span>
                            </div>
                          )
                      )}
                    </div>
                  )}
                  {!responses?.weight_kg && !responses?.measurements && (
                    <p className="text-sm text-muted-foreground">
                      No body stats reported this week.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Client's Words */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    In Their Words
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {responses?.biggest_win && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-success mb-1">
                        <Trophy className="h-3 w-3" />
                        Biggest Win
                      </div>
                      <p className="text-sm text-foreground">
                        {responses.biggest_win}
                      </p>
                    </div>
                  )}
                  {responses?.biggest_challenge && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-accent mb-1">
                        <Target className="h-3 w-3" />
                        Biggest Challenge
                      </div>
                      <p className="text-sm text-foreground">
                        {responses.biggest_challenge}
                      </p>
                    </div>
                  )}
                  {responses?.injuries_or_pain && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-destructive mb-1">
                        <Heart className="h-3 w-3" />
                        Pain / Injury
                      </div>
                      <p className="text-sm text-foreground">
                        {responses.injuries_or_pain}
                      </p>
                    </div>
                  )}
                  {responses?.questions_for_coach && (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs text-info mb-1">
                        <MessageSquare className="h-3 w-3" />
                        Question for Coach
                      </div>
                      <p className="text-sm text-foreground">
                        {responses.questions_for_coach}
                      </p>
                    </div>
                  )}
                  {!responses?.biggest_win &&
                    !responses?.biggest_challenge &&
                    !responses?.questions_for_coach && (
                      <p className="text-sm text-muted-foreground">
                        No written responses this week.
                      </p>
                    )}
                </CardContent>
              </Card>
            </div>

            {/* Coach Feedback Section */}
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-foreground">
                  Your Feedback to Client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <textarea
                  className="w-full rounded-md border border-border bg-input p-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-y min-h-[100px]"
                  placeholder="Write your feedback for the client... This is what they'll see."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
                <textarea
                  className="w-full rounded-md border border-border bg-input p-3 text-sm text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-ring resize-y"
                  placeholder="Internal notes (only you can see these)..."
                  value={internalNotes}
                  onChange={(e) => setInternalNotes(e.target.value)}
                  rows={2}
                />
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSaveFeedback(false)}
                    disabled={saving}
                  >
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                    Save Draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSaveFeedback(true)}
                    disabled={saving}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Send & Mark Reviewed
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* PHOTOS TAB */}
          <TabsContent value="photos">
            <PhotoComparison
              currentPhotos={checkIn.check_in_photos || []}
              clientId={checkIn.client_id}
              coachId={coachId}
            />
          </TabsContent>

          {/* TRENDS TAB */}
          <TabsContent value="trends">
            <WeightTrendChart bodyStats={bodyStats} />
          </TabsContent>

          {/* NOTES & INSTRUCTIONS TAB — replaces Notion */}
          <TabsContent value="notes">
            <CoachNotesPanel
              notes={coachNotes}
              clientId={checkIn.client_id}
              coachId={coachId}
            />
          </TabsContent>

          {/* HABITS TAB */}
          <TabsContent value="habits">
            <HabitTracker
              habits={habits}
              clientId={checkIn.client_id}
              coachId={coachId}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function ScoreRow({
  icon,
  label,
  value,
  suffix,
  invertColor = false,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  suffix?: string;
  invertColor?: boolean;
}) {
  if (value == null) return null;
  const color = invertColor
    ? value >= 8
      ? "text-destructive"
      : value >= 5
        ? "text-accent"
        : "text-success"
    : value >= 8
      ? "text-success"
      : value >= 5
        ? "text-foreground"
        : "text-accent";

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-20 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              invertColor
                ? value >= 8
                  ? "bg-destructive"
                  : value >= 5
                    ? "bg-accent"
                    : "bg-success"
                : value >= 8
                  ? "bg-success"
                  : value >= 5
                    ? "bg-primary"
                    : "bg-accent"
            }`}
            style={{ width: `${value * 10}%` }}
          />
        </div>
        <span className={`text-sm font-medium tabular-nums ${color}`}>
          {value}
        </span>
        {suffix && (
          <span className="text-xs text-muted-foreground">{suffix}</span>
        )}
      </div>
    </div>
  );
}

function WeightDelta({
  current,
  stats,
}: {
  current: number;
  stats: BodyStat[];
}) {
  const previous = stats
    .filter((s) => s.weight_kg != null)
    .slice(-2)[0];

  if (!previous?.weight_kg) return null;

  const delta = current - previous.weight_kg;
  if (Math.abs(delta) < 0.1) {
    return (
      <span className="flex items-center text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
      </span>
    );
  }
  return (
    <span
      className={`flex items-center text-xs ${
        delta > 0 ? "text-accent" : "text-success"
      }`}
    >
      {delta > 0 ? (
        <TrendingUp className="mr-0.5 h-3 w-3" />
      ) : (
        <TrendingDown className="mr-0.5 h-3 w-3" />
      )}
      {Math.abs(delta).toFixed(1)}
    </span>
  );
}
