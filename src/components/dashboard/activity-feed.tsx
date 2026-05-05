import { Inbox } from "lucide-react";
import { ActivityRow } from "@/components/patterns/activity-row";
import type { ActivityItem } from "@/lib/coach-home";

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <Inbox aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Workouts, check-ins, photos, and weights will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <ActivityRow key={it.id} item={it} />
          ))}
        </ul>
      )}
    </section>
  );
}
