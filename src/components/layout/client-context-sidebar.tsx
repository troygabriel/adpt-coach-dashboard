"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  StickyNote,
  TrendingUp,
  UtensilsCrossed,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type SubPage = {
  key: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Routed sub-page (relative to /clients/[clientId]) — null = "coming soon". */
  segment: string | null;
};

const SUB_PAGES: SubPage[] = [
  { key: "dashboard", title: "Dashboard", icon: LayoutDashboard, segment: "" },
  { key: "calendar", title: "Calendar", icon: Calendar, segment: "calendar" },
  { key: "habits", title: "Goals & habits", icon: ListChecks, segment: null },
  { key: "program", title: "Training program", icon: Dumbbell, segment: "training-program" },
  { key: "meals", title: "Meal plan", icon: UtensilsCrossed, segment: null },
  { key: "progress", title: "Progress", icon: TrendingUp, segment: null },
  { key: "notes", title: "Notes", icon: StickyNote, segment: "notes" },
];

function getInitials(name: string | null | undefined) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function ClientContextSidebar({
  collapsed,
  onToggle,
  clientId,
  clientName,
}: {
  collapsed: boolean;
  onToggle: () => void;
  clientId: string;
  clientName: string | null;
}) {
  const pathname = usePathname();
  const base = `/clients/${clientId}`;

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          collapsed ? "w-[68px]" : "w-[240px]"
        )}
      >
        {/* Client identity header */}
        <div
          className={cn(
            "flex items-center gap-3 border-b border-sidebar-border",
            collapsed ? "h-14 justify-center px-3" : "h-auto px-4 py-4"
          )}
        >
          <Avatar
            className={cn(collapsed ? "h-8 w-8" : "h-10 w-10", "shrink-0")}
          >
            <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
              {getInitials(clientName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-foreground">
                {clientName ?? "Client"}
              </p>
              <Link
                href={`/messages?client=${clientId}`}
                className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <MessageSquare aria-hidden="true" className="h-3 w-3" />
                Message
              </Link>
            </div>
          )}
        </div>

        {/* Sub-page nav */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {SUB_PAGES.map((sp) => {
            const Icon = sp.icon;
            const href =
              sp.segment === null
                ? null
                : sp.segment
                ? `${base}/${sp.segment}`
                : base;
            const isActive =
              href !== null &&
              (pathname === href ||
                (sp.segment && pathname.startsWith(href + "/")) ||
                (sp.segment === "" && pathname === base));
            const disabled = sp.segment === null;

            const inner = (
              <span
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  disabled
                    ? "cursor-not-allowed text-muted-foreground/50"
                    : isActive
                    ? "bg-foreground/10 text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                <Icon aria-hidden="true" className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{sp.title}</span>
                    {disabled && (
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </span>
            );

            const node =
              disabled || !href ? (
                <div key={sp.key} aria-disabled="true">
                  {inner}
                </div>
              ) : (
                <Link key={sp.key} href={href}>
                  {inner}
                </Link>
              );

            if (collapsed) {
              return (
                <Tooltip key={sp.key}>
                  <TooltipTrigger asChild>{node}</TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="border-border bg-card text-foreground"
                  >
                    {sp.title}
                    {disabled ? " · Soon" : ""}
                  </TooltipContent>
                </Tooltip>
              );
            }
            return node;
          })}
        </nav>

        {/* Footer: Return to overview + collapse */}
        <div className="space-y-1 border-t border-sidebar-border p-3">
          <Link
            href="/clients"
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-hover hover:text-foreground",
              collapsed && "justify-center px-0"
            )}
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Return to overview</span>}
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center text-sidebar-foreground hover:text-foreground"
          >
            {collapsed ? (
              <ChevronRight aria-hidden="true" className="h-4 w-4" />
            ) : (
              <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            )}
          </Button>
        </div>
      </aside>
    </TooltipProvider>
  );
}
