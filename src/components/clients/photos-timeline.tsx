"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ProgressPhoto = {
  id: string;
  storage_path: string;
  pose: "front" | "side" | "back" | "other" | null;
  taken_at: string;
  created_at: string;
  notes: string | null;
  url: string | null;
};

const POSE_LABELS: Record<string, string> = {
  front: "Front",
  side: "Side",
  back: "Back",
  other: "Other",
};

const POSE_ORDER = ["front", "side", "back", "other"] as const;

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function PhotosTimeline({ photos }: { photos: ProgressPhoto[] }) {
  const [active, setActive] = useState<ProgressPhoto | null>(null);

  const grouped = useMemo(() => {
    const byDate = new Map<string, ProgressPhoto[]>();
    for (const p of photos) {
      const arr = byDate.get(p.taken_at) ?? [];
      arr.push(p);
      byDate.set(p.taken_at, arr);
    }
    // Sort poses within each date by canonical order
    for (const arr of byDate.values()) {
      arr.sort((a, b) => {
        const ai = POSE_ORDER.indexOf((a.pose ?? "other") as typeof POSE_ORDER[number]);
        const bi = POSE_ORDER.indexOf((b.pose ?? "other") as typeof POSE_ORDER[number]);
        return ai - bi;
      });
    }
    return [...byDate.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [photos]);

  if (photos.length === 0) {
    return (
      <Card className="p-5">
        <h2 className="text-base font-medium">Progress photos</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          No photos yet. Photos uploaded by the client will appear here.
        </p>
      </Card>
    );
  }

  return (
    <Card className="space-y-5 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium">Progress photos</h2>
        <span className="text-xs text-muted-foreground">
          {photos.length} {photos.length === 1 ? "photo" : "photos"} ·{" "}
          {grouped.length} {grouped.length === 1 ? "session" : "sessions"}
        </span>
      </div>

      <div className="space-y-6">
        {grouped.map(([date, list]) => (
          <div key={date} className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {formatDate(date)}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {list.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setActive(p)}
                  aria-label={`View ${POSE_LABELS[p.pose ?? "other"]} photo from ${formatDate(p.taken_at)}`}
                  className={cn(
                    "group relative aspect-[3/4] overflow-hidden rounded-md border bg-muted/30",
                    "transition-opacity hover:opacity-90"
                  )}
                >
                  {p.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.url}
                      alt={POSE_LABELS[p.pose ?? "other"]}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      Unavailable
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
                    {POSE_LABELS[p.pose ?? "other"]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-3">
          {active?.url ? (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={active.url}
                alt={POSE_LABELS[active.pose ?? "other"]}
                className="max-h-[80vh] w-full rounded object-contain"
              />
              <div className="flex items-center justify-between px-2 pb-1 text-xs text-muted-foreground">
                <span>{formatDate(active.taken_at)}</span>
                <span>{POSE_LABELS[active.pose ?? "other"]}</span>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
