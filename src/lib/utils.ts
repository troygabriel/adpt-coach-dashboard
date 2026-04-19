import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function formatRelativeDate(date: string): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "active":
      return "bg-primary/15 text-primary border-primary/30";
    case "pending":
      return "bg-accent/15 text-accent border-accent/30";
    case "paused":
      return "bg-muted-foreground/15 text-muted-foreground border-muted-foreground/30";
    case "archived":
      return "bg-muted-foreground/10 text-muted-foreground/60 border-muted-foreground/20";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}
