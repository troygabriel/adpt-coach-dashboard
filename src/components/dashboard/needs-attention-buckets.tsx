import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Chip } from "@/components/patterns/chip";
import { REASON_LABEL, type AttentionBuckets, type AttentionItem } from "@/lib/coach-home";

const BUCKETS: Array<{
  key: keyof AttentionBuckets;
  title: string;
}> = [
  { key: "needNewProgram", title: "Need new programs" },
  { key: "endingSoon", title: "Phases ending soon" },
  { key: "notTraining", title: "Not training" },
  { key: "notMessaged", title: "Not messaged 7d+" },
];

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

export function NeedsAttentionBuckets({
  buckets,
  total,
}: {
  buckets: AttentionBuckets;
  total: number;
}) {
  if (total === 0) {
    return (
      <section className="rounded-xl border border-border bg-card">
        <header className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold tracking-tight">Needs attention</h2>
        </header>
        <div className="py-12 text-center">
          <p className="text-sm font-medium">All clients on track</p>
          <p className="mt-1 text-xs text-muted-foreground">
            No clients flagged. Nice work.
          </p>
        </div>
      </section>
    );
  }

  const visibleBuckets = BUCKETS.filter(({ key }) => buckets[key].length > 0);

  return (
    <section className="rounded-xl border border-border bg-card">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold tracking-tight">Needs attention</h2>
          <Chip>{total}</Chip>
        </div>
        <Link
          href="/clients"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          All clients
        </Link>
      </header>
      <div className="divide-y divide-border">
        {visibleBuckets.map(({ key, title }) => (
          <Bucket key={key} title={title} items={buckets[key]} />
        ))}
      </div>
    </section>
  );
}

function Bucket({ title, items }: { title: string; items: AttentionItem[] }) {
  return (
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{title}</h3>
        <span className="text-xs text-muted-foreground tabular-nums">
          {items.length}
        </span>
      </div>
      <ul className="mt-2 space-y-1">
        {items.map((item) => (
          <li key={item.clientId}>
            <Link
              href={`/clients/${item.clientId}`}
              className="group -mx-2 flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40"
            >
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
                  {getInitials(item.firstName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {item.firstName ?? "Unnamed"}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {item.reasons.map((r) => (
                    <Chip key={r} variant="warning">
                      {REASON_LABEL[r]}
                    </Chip>
                  ))}
                </div>
              </div>
              <ChevronRight
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
