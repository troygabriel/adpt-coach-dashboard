import Link from "next/link";
import { cn } from "@/lib/utils";

export type StatLineItem = {
  value: number;
  /** Template with {n} placeholder. Used when value > 0. e.g. "{n} active". */
  template: string;
  /** Used when value === 0. e.g. "no programs ending soon". */
  zeroText: string;
  href?: string;
};

export function StatLine({
  items,
  className,
}: {
  items: StatLineItem[];
  className?: string;
}) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {items.map((item, i) => {
        const isZero = item.value === 0;

        let body: React.ReactNode;
        if (isZero) {
          body = item.zeroText;
        } else {
          const [before, after] = item.template.split("{n}");
          body = (
            <>
              {before}
              <span className="font-medium tabular-nums text-foreground">
                {item.value}
              </span>
              {after}
            </>
          );
        }

        const segment = item.href ? (
          <Link
            href={item.href}
            className="transition-colors hover:text-foreground"
          >
            {body}
          </Link>
        ) : (
          <span>{body}</span>
        );

        return (
          <span key={item.template}>
            {i > 0 && <span className="mx-2 text-border">·</span>}
            {segment}
          </span>
        );
      })}
    </p>
  );
}
