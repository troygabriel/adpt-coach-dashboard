import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Stat = {
  label: string;
  value: number | string;
  href?: string;
  hint?: string;
  emphasize?: boolean;
};

export function StatStrip({ stats }: { stats: Stat[] }) {
  return (
    <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
      {stats.map((s) => {
        const inner = (
          <div
            className={cn(
              "group flex h-full items-start justify-between gap-3 bg-background p-5 transition-colors",
              s.href && "hover:bg-muted/40 cursor-pointer"
            )}
          >
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {s.label}
              </p>
              <p
                className={cn(
                  "text-3xl font-semibold tracking-tight tabular-nums",
                  s.emphasize ? "text-foreground" : "text-foreground"
                )}
              >
                {s.value}
              </p>
              {s.hint && (
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              )}
            </div>
            {s.href && (
              <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            )}
          </div>
        );
        return s.href ? (
          <Link key={s.label} href={s.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={s.label}>{inner}</div>
        );
      })}
    </div>
  );
}
