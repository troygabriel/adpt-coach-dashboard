/**
 * Recent activity rail for the client overview — the right column of the
 * Trainerize-style two-column layout. Server-rendered.
 *
 * Unions the four activity sources (workouts, weigh-ins, photos, messages)
 * client-side because there's no SQL UNION RPC yet; defer that to a
 * follow-up if N+1 queries become a problem (most clients won't have
 * thousands of rows in the trailing 30 days).
 */

import Link from "next/link";
import {
  Camera,
  Dumbbell,
  MessageSquare,
  Scale,
  type LucideIcon,
} from "lucide-react";

type Activity =
  | { kind: "workout"; at: Date; title: string; href: string; sessionId: string }
  | { kind: "weighin"; at: Date; weightKg: number | null; bodyFatPct: number | null; href: string }
  | { kind: "photo"; at: Date; href: string; pose: string | null }
  | {
      kind: "message";
      at: Date;
      preview: string;
      href: string;
      fromClient: boolean;
    };

type WorkoutSessionRow = {
  id: string;
  started_at: string;
  ended_at: string | null;
  title: string | null;
};
type BodyStatRow = {
  date: string;
  created_at: string;
  weight_kg: number | null;
  body_fat_pct: number | null;
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

function relativeTime(at: Date): string {
  const diffMs = Date.now() - at.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return at.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ClientActivityRail({
  clientId,
  workouts,
  weighIns,
  photos,
  messages,
}: {
  clientId: string;
  workouts: WorkoutSessionRow[];
  weighIns: BodyStatRow[];
  photos: PhotoRow[];
  messages: MessageRow[];
}) {
  const activity: Activity[] = [
    ...workouts.map((w) => ({
      kind: "workout" as const,
      at: new Date(w.ended_at ?? w.started_at),
      title: w.title ?? "Workout",
      href: `/clients/${clientId}/training-program`,
      sessionId: w.id,
    })),
    ...weighIns.map((b) => ({
      kind: "weighin" as const,
      at: new Date(b.created_at),
      weightKg: b.weight_kg,
      bodyFatPct: b.body_fat_pct,
      href: `/clients/${clientId}/progress`,
    })),
    ...photos.map((p) => ({
      kind: "photo" as const,
      at: new Date(p.created_at),
      href: `/clients/${clientId}/progress`,
      pose: p.pose,
    })),
    ...messages.map((m) => ({
      kind: "message" as const,
      at: new Date(m.created_at),
      preview:
        m.content.length > 60 ? `${m.content.slice(0, 60)}…` : m.content,
      href: `/messages?client=${clientId}`,
      fromClient: m.sender_id === clientId,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <aside className="space-y-3 rounded-xl border border-border bg-card p-4">
      <header className="flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Recent activity
        </h3>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {activity.length}
        </span>
      </header>
      {activity.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          Nothing yet. As your client logs workouts, weigh-ins, and photos,
          they&apos;ll show up here.
        </p>
      ) : (
        <ul className="space-y-0.5">
          {activity.slice(0, 20).map((a, i) => (
            <li key={`${a.kind}-${i}-${a.at.getTime()}`}>
              <ActivityRow a={a} />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

function ActivityRow({ a }: { a: Activity }) {
  const { Icon, label } = activityMeta(a);
  return (
    <Link
      href={a.href}
      className="flex items-start gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-muted/40"
    >
      <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon aria-hidden="true" className="h-3 w-3 text-muted-foreground" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs">{label}</p>
        <p className="text-[10px] text-muted-foreground">{relativeTime(a.at)}</p>
      </div>
    </Link>
  );
}

function activityMeta(a: Activity): { Icon: LucideIcon; label: string } {
  switch (a.kind) {
    case "workout":
      return { Icon: Dumbbell, label: `Completed ${a.title}` };
    case "weighin": {
      const lbs = a.weightKg ? (a.weightKg * 2.20462).toFixed(1) : null;
      return {
        Icon: Scale,
        label: lbs
          ? `Weighed in: ${lbs} lbs${a.bodyFatPct != null ? ` · ${a.bodyFatPct}% BF` : ""}`
          : "Logged body stats",
      };
    }
    case "photo":
      return {
        Icon: Camera,
        label: a.pose ? `Progress photo (${a.pose})` : "Progress photo",
      };
    case "message":
      return {
        Icon: MessageSquare,
        label: a.fromClient ? `Replied: "${a.preview}"` : `You: "${a.preview}"`,
      };
  }
}
