import { cn } from "@/lib/utils";

/**
 * Single-arc circular progress indicator. Pure CSS via conic-gradient — no SVG.
 * Color follows `currentColor` so the caller picks the arc shade via text class.
 */
export function ComplianceDonut({
  percent,
  size = 64,
  thickness = 6,
  centerLabel,
  className,
  muted = false,
}: {
  /** 0-100. Values outside this range are clamped. */
  percent: number;
  size?: number;
  thickness?: number;
  /** Override the centered label. Defaults to "{n}%". */
  centerLabel?: string;
  className?: string;
  /** Render in a muted state (e.g. for future weeks where no data exists yet). */
  muted?: boolean;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  const label = centerLabel ?? `${Math.round(pct)}%`;
  const arcColor = muted ? "var(--color-border)" : "currentColor";
  const trackColor = "var(--color-muted)";

  return (
    <div
      role="img"
      aria-label={`${label} compliance`}
      className={cn(
        "relative shrink-0 rounded-full",
        muted ? "text-muted-foreground" : "text-foreground",
        className
      )}
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${arcColor} ${pct}%, ${trackColor} 0)`,
      }}
    >
      <div
        className="absolute rounded-full bg-background"
        style={{
          inset: thickness,
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium tabular-nums">{label}</span>
      </div>
    </div>
  );
}
