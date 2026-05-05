import { subDays } from "date-fns";
import { createClient } from "./supabase/server";

export type AttentionReason =
  | "no_program"
  | "program_ending_soon"
  | "no_workout_7d"
  | "no_message_7d";

export type AttentionItem = {
  clientId: string;
  firstName: string | null;
  reasons: AttentionReason[];
  programEndDate: string | null;
};

export type AttentionBuckets = {
  needNewProgram: AttentionItem[];
  endingSoon: AttentionItem[];
  notTraining: AttentionItem[];
  notMessaged: AttentionItem[];
};

export type ActivityType = "workout" | "checkin" | "photo" | "body_stat";

export type ActivityItem = {
  id: string;
  type: ActivityType;
  clientId: string;
  firstName: string | null;
  /** Verb phrase, rendered in muted text. e.g. "completed", "submitted", "added", "weighed in at" */
  verb: string;
  /** Object phrase, rendered in foreground. e.g. workout name, "a check-in", "161.0 lbs". null = no foreground emphasis. */
  object: string | null;
  occurredAt: string;
  /** For photo type: signed URLs for inline thumbnails (cap 3). */
  photoUrls?: string[];
};

export type CoachHomeData = {
  coachName: string | null;
  stats: {
    activeClients: number;
    engagedThisWeek: number;
    programsEndingSoon: number;
  };
  buckets: AttentionBuckets;
  totalNeedingAttention: number;
  activity: ActivityItem[];
};

export const REASON_LABEL: Record<AttentionReason, string> = {
  no_program: "No program",
  program_ending_soon: "Phase ending soon",
  no_workout_7d: "No training 7d+",
  no_message_7d: "Not messaged 7d+",
};

export async function getCoachHomeData(coachId: string): Promise<CoachHomeData> {
  const supabase = await createClient();
  const now = new Date();
  const sevenDaysAgo = subDays(now, 7).toISOString();
  const fourteenDaysAgo = subDays(now, 14).toISOString();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 86400000).toISOString();

  const { data: coach } = await supabase
    .from("coaches")
    .select("display_name")
    .eq("id", coachId)
    .maybeSingle();

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
      buckets: { needNewProgram: [], endingSoon: [], notTraining: [], notMessaged: [] },
      totalNeedingAttention: 0,
      activity: [],
    };
  }

  const [
    { data: profiles },
    { data: programs },
    { data: checkIns },
    { data: sessions },
    { data: coachMessages },
    { data: photos },
    { data: bodyStats },
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
    supabase
      .from("messages")
      .select("recipient_id, created_at")
      .eq("sender_id", coachId)
      .in("recipient_id", clientIds)
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("progress_photos")
      .select("id, client_id, storage_path, taken_at, created_at, pose")
      .in("client_id", clientIds)
      .gte("created_at", fourteenDaysAgo)
      .order("created_at", { ascending: false }),
    supabase
      .from("body_stats")
      .select("id, client_id, weight_kg, date, created_at")
      .in("client_id", clientIds)
      .gte("created_at", fourteenDaysAgo)
      .not("weight_kg", "is", null)
      .order("created_at", { ascending: false }),
  ]);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const programByClient = new Map((programs ?? []).map((p) => [p.client_id, p]));

  const lastSessionByClient = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (!lastSessionByClient.has(s.user_id) && s.started_at) {
      lastSessionByClient.set(s.user_id, s.started_at);
    }
  }

  const lastCoachMessageByClient = new Map<string, string>();
  for (const m of coachMessages ?? []) {
    if (!lastCoachMessageByClient.has(m.recipient_id)) {
      lastCoachMessageByClient.set(m.recipient_id, m.created_at);
    }
  }

  // Derive AttentionItems per client, then bucket.
  const itemsByClient = new Map<string, AttentionItem>();
  for (const clientId of clientIds) {
    const profile = profileMap.get(clientId);
    const reasons: AttentionReason[] = [];
    const program = programByClient.get(clientId);

    if (!program) {
      reasons.push("no_program");
    } else if (
      program.end_date &&
      program.end_date <= sevenDaysFromNow &&
      program.end_date >= now.toISOString()
    ) {
      reasons.push("program_ending_soon");
    }

    const lastSession = lastSessionByClient.get(clientId);
    if (!lastSession || lastSession < sevenDaysAgo) {
      reasons.push("no_workout_7d");
    }

    const lastCoachMsg = lastCoachMessageByClient.get(clientId);
    if (!lastCoachMsg || lastCoachMsg < sevenDaysAgo) {
      reasons.push("no_message_7d");
    }

    if (reasons.length > 0) {
      itemsByClient.set(clientId, {
        clientId,
        firstName: profile?.first_name ?? null,
        reasons,
        programEndDate: program?.end_date ?? null,
      });
    }
  }

  // A client can appear in multiple buckets. Each bucket is independent.
  const buckets: AttentionBuckets = {
    needNewProgram: [],
    endingSoon: [],
    notTraining: [],
    notMessaged: [],
  };
  for (const item of itemsByClient.values()) {
    if (item.reasons.includes("no_program")) buckets.needNewProgram.push(item);
    if (item.reasons.includes("program_ending_soon")) buckets.endingSoon.push(item);
    if (item.reasons.includes("no_workout_7d")) buckets.notTraining.push(item);
    if (item.reasons.includes("no_message_7d")) buckets.notMessaged.push(item);
  }

  // Activity feed across four event types.
  const activity: ActivityItem[] = [];

  for (const s of sessions ?? []) {
    const profile = profileMap.get(s.user_id);
    activity.push({
      id: `s-${s.id}`,
      type: "workout",
      clientId: s.user_id,
      firstName: profile?.first_name ?? null,
      verb: s.ended_at ? "completed" : "started",
      object: s.title || "a workout",
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
      verb: "submitted",
      object: "a check-in",
      occurredAt: ci.submitted_at,
    });
  }

  for (const bs of bodyStats ?? []) {
    if (bs.weight_kg == null) continue;
    const profile = profileMap.get(bs.client_id);
    const lbs = (Number(bs.weight_kg) * 2.20462).toFixed(1);
    activity.push({
      id: `b-${bs.id}`,
      type: "body_stat",
      clientId: bs.client_id,
      firstName: profile?.first_name ?? null,
      verb: "weighed in at",
      object: `${lbs} lbs`,
      occurredAt: bs.created_at,
    });
  }

  // Photos: group by (client, day) so 5 photos in one session = 1 row.
  // Sign URLs only for the most-recent few groups; older groups render without thumbnails.
  type PhotoRow = NonNullable<typeof photos>[number];
  const photoGroups = new Map<string, PhotoRow[]>();
  for (const p of photos ?? []) {
    const day = p.created_at.slice(0, 10);
    const key = `${p.client_id}-${day}`;
    const arr = photoGroups.get(key) ?? [];
    arr.push(p);
    photoGroups.set(key, arr);
  }

  let signedCount = 0;
  for (const [key, group] of photoGroups) {
    const first = group[0];
    const profile = profileMap.get(first.client_id);
    let photoUrls: string[] = [];
    if (signedCount < 5) {
      const toSign = group.slice(0, 3);
      photoUrls = (
        await Promise.all(
          toSign.map(async (p) => {
            const { data } = await supabase.storage
              .from("progress-photos")
              .createSignedUrl(p.storage_path, 3600);
            return data?.signedUrl ?? null;
          })
        )
      ).filter((u): u is string => !!u);
      signedCount++;
    }
    activity.push({
      id: `p-${key}`,
      type: "photo",
      clientId: first.client_id,
      firstName: profile?.first_name ?? null,
      verb: "added",
      object:
        group.length === 1 ? "a progress photo" : `${group.length} progress photos`,
      occurredAt: first.created_at,
      photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
    });
  }

  activity.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  // Stats
  const engagedClients = new Set<string>();
  for (const s of sessions ?? []) {
    if (s.started_at >= sevenDaysAgo) engagedClients.add(s.user_id);
  }

  const programsEndingSoon = (programs ?? []).filter(
    (p) =>
      p.end_date &&
      p.end_date >= now.toISOString() &&
      p.end_date <= sevenDaysFromNow
  ).length;

  return {
    coachName: coach?.display_name ?? null,
    stats: {
      activeClients: clientIds.length,
      engagedThisWeek: engagedClients.size,
      programsEndingSoon,
    },
    buckets,
    totalNeedingAttention: itemsByClient.size,
    activity: activity.slice(0, 30),
  };
}
