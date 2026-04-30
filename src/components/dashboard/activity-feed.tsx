import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Dumbbell, ClipboardCheck, Inbox } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ActivityItem } from "@/lib/coach-home";

function getInitials(name: string | null) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <h2 className="text-base font-semibold tracking-tight">Recent activity</h2>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <Inbox className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">No activity yet</p>
          <p className="text-xs text-muted-foreground">
            Workouts, check-ins, and PRs will show up here.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((it) => {
            const Icon = it.type === "workout" ? Dumbbell : ClipboardCheck;
            return (
              <li key={it.id}>
                <Link
                  href={`/clients/${it.clientId}`}
                  className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
                      {getInitials(it.firstName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">
                      <span className="font-medium">{it.firstName ?? "A client"}</span>
                      <span className="text-muted-foreground"> {it.summary}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(it.occurredAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Icon className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
