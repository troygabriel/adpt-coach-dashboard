import { subDays } from "date-fns";
import { createClient } from "./supabase/server";

export type AttentionReason =
  | "no_program"
  | "program_ending_soon"
  | "no_workout_7d"
  | "no_checkin_7d";

export type AttentionItem = {
  clientId: string;
  firstName: string | null;
  reasons: AttentionReason[];
  programEndDate: string | null;
};

export type ActivityItem = {
  id: string;
  type: "workout" | "checkin";
  clientId: string;
  firstName: string | null;
  summary: string;
  occurredAt: string;
};

export type CoachHomeData = {
  coachName: string | null;
  stats: {
    activeClients: number;
    engagedThisWeek: number;
    programsEndingSoon: number;
  };
  needsAttention: AttentionItem[];
  activity: ActivityItem[];
};

const REASON_RANK: Record<AttentionReason, number> = {
  no_program: 4,
  program_ending_soon: 3,
  no_workout_7d: 2,
  no_checkin_7d: 1,
};

export async function getCoachHomeData(coachId: string): Promise<CoachHomeData> {
  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7).toISOString();
  const fourteenDaysAgo = subDays(now, 14).toISOString();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Coach display name
  const { data: coach } = await supabase
    .from("coaches")
    .select("display_name")
    .eq("id", coachId)
    .maybeSingle();

  // Active roster
  const { data: roster } = await supabase
    .from("coach_clients")
    .select("client_id")
    .eq("coach_id", coachId)
    .eq("status", "active");

  const clientIds = (roster ?? []).map((r) => r.client_id);

  if (clientIds.length === 0) {
    return {
      coachName: coach?.display_name ?? null,
      stats: { activeClients: 0, engagedThisWeek: 0, programsEndingSoon: 0 },
      needsAttention: [],
      activity: [],
    };
  }

  const [
    { data: profiles },
    { data: programs },
    { data: checkIns },
    { data: sessions },
  ] = await Promise.all([
    supabase.from("profiles").select("id, first_name").in("id", clientIds),
    supabase
      .from("coaching_programs")
      .select("client_id, end_date, status")
      .eq("coach_id", coachId)
      .in("client_id", clientIds)
      .eq("status", "active"),
    supabase
      .from("check_ins")
      .select("id, client_id, submitted_at, status")
      .eq("coach_id", coachId)
      .in("client_id", clientIds)
      .not("submitted_at", "is", null)
      .gte("submitted_at", fourteenDaysAgo)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("workout_sessions")
      .select("id, user_id, title, started_at, ended_at")
      .in("user_id", clientIds)
      .gte("started_at", fourteenDaysAgo)
      .order("started_at", { ascending: false }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const programByClient = new Map((programs ?? []).map((p) => [p.client_id, p]));

  const lastCheckinByClient = new Map<string, string>();
  for (const ci of checkIns ?? []) {
    if (!lastCheckinByClient.has(ci.client_id) && ci.submitted_at) {
      lastCheckinByClient.set(ci.client_id, ci.submitted_at);
    }
  }

  const lastSessionByClient = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (!lastSessionByClient.has(s.user_id) && s.started_at) {
      lastSessionByClient.set(s.user_id, s.started_at);
    }
  }

  // Compose Needs Attention
  const needsAttention: AttentionItem[] = [];
  for (const clientId of clientIds) {
    const profile = profileMap.get(clientId);
    const reasons: AttentionReason[] = [];
    const program = programByClient.get(clientId);

    if (!program) {
      reasons.push("no_program");
    } else if (program.end_date && program.end_date <= sevenDaysFromNow && program.end_date >= now.toISOString()) {
      reasons.push("program_ending_soon");
    }

    const lastSession = lastSessionByClient.get(clientId);
    if (!lastSession || lastSession < sevenDaysAgo) {
      reasons.push("no_workout_7d");
    }

    const lastCheckin = lastCheckinByClient.get(clientId);
    if (!lastCheckin || lastCheckin < sevenDaysAgo) {
      reasons.push("no_checkin_7d");
    }

    if (reasons.length > 0) {
      needsAttention.push({
        clientId,
        firstName: profile?.first_name ?? null,
        reasons,
        programEndDate: program?.end_date ?? null,
      });
    }
  }

  // Sort by severity (highest reason rank first, then count of reasons)
  needsAttention.sort((a, b) => {
    const aMax = Math.max(...a.reasons.map((r) => REASON_RANK[r]));
    const bMax = Math.max(...b.reasons.map((r) => REASON_RANK[r]));
    if (bMax !== aMax) return bMax - aMax;
    return b.reasons.length - a.reasons.length;
  });

  // Compose Activity feed (latest 20 events across sessions + check-ins)
  const activity: ActivityItem[] = [];

  for (const s of sessions ?? []) {
    const profile = profileMap.get(s.user_id);
    activity.push({
      id: `s-${s.id}`,
      type: "workout",
      clientId: s.user_id,
      firstName: profile?.first_name ?? null,
      summary: s.ended_at ? `completed ${s.title || "a workout"}` : `started ${s.title || "a workout"}`,
      occurredAt: s.started_at,
    });
  }

  for (const ci of checkIns ?? []) {
    if (!ci.submitted_at) continue;
    const profile = profileMap.get(ci.client_id);
    activity.push({
      id: `c-${ci.id}`,
      type: "checkin",
      clientId: ci.client_id,
      firstName: profile?.first_name ?? null,
      summary: "submitted a check-in",
      occurredAt: ci.submitted_at,
    });
  }

  activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  // Stats
  const engagedClients = new Set<string>();
  for (const s of sessions ?? []) {
    if (s.started_at >= sevenDaysAgo) engagedClients.add(s.user_id);
  }

  const programsEndingSoon = (programs ?? []).filter(
    (p) => p.end_date && p.end_date >= now.toISOString() && p.end_date <= sevenDaysFromNow
  ).length;

  return {
    coachName: coach?.display_name ?? null,
    stats: {
      activeClients: clientIds.length,
      engagedThisWeek: engagedClients.size,
      programsEndingSoon,
    },
    needsAttention: needsAttention.slice(0, 12),
    activity: activity.slice(0, 20),
  };
}

export const REASON_LABEL: Record<AttentionReason, string> = {
  no_program: "No program",
  program_ending_soon: "Program ending soon",
  no_workout_7d: "No workout 7d+",
  no_checkin_7d: "No check-in 7d+",
};
