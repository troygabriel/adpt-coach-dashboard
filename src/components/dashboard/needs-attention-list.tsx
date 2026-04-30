import Link from "next/link";
import { ChevronRight, AlertCircle } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { REASON_LABEL, type AttentionItem } from "@/lib/coach-home";

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

export function NeedsAttentionList({ items }: { items: AttentionItem[] }) {
  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">Needs attention</h2>
          {items.length > 0 && (
            <Badge variant="outline" className="rounded-full border-foreground/20 bg-foreground/5 px-2 py-0 text-xs font-medium tabular-nums">
              {items.length}
            </Badge>
          )}
        </div>
        <Link
          href="/clients"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          All clients
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <div className="rounded-full bg-muted p-3">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">All clients on track</p>
          <p className="text-xs text-muted-foreground">
            No clients flagged. Nice work.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.clientId}>
              <Link
                href={`/clients/${item.clientId}`}
                className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40"
              >
                <Avatar className="h-9 w-9 shrink-0">
                  <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                    {getInitials(item.firstName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.firstName ?? "Unnamed client"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {item.reasons.map((r) => (
                      <span
                        key={r}
                        className="inline-flex items-center rounded-full border border-border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                      >
                        {REASON_LABEL[r]}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
