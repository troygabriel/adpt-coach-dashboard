import { cn } from "@/lib/utils";

export type ChipVariant =
  | "neutral"
  | "active"
  | "warning"
  | "success"
  | "destructive";

// Color discipline: only `success` (green) and `destructive` (red) use hue —
// per CLAUDE.md the design mandate is B&W with functional success/error only.
// `warning` is a darker B&W neutral, distinguishable from `neutral` by weight,
// not by color.
const VARIANT_STYLES: Record<ChipVariant, string> = {
  neutral: "bg-muted text-foreground",
  active: "bg-foreground text-background",
  warning: "bg-foreground/5 text-foreground border border-foreground/15",
  success: "bg-success/10 text-success border border-success/30",
  destructive:
    "bg-destructive/10 text-destructive border border-destructive/30",
};

export function Chip({
  children,
  variant = "neutral",
  className,
}: {
  children: React.ReactNode;
  variant?: ChipVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tabular-nums",
        VARIANT_STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
