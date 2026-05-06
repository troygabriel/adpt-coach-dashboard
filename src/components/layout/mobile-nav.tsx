"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Calendar,
  ClipboardCheck,
  Dumbbell,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Calendar,
  Dumbbell,
  MessageSquare,
  BarChart3,
  Settings,
};

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
  /** href → badge count. Renders a small chip on matching nav items. */
  badges?: Record<string, number>;
}

export function MobileNav({ open, onClose, badges = {} }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[240px] bg-sidebar border-sidebar-border p-0">
        <SheetHeader className="h-14 border-b border-sidebar-border px-4 flex justify-center">
          <SheetTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <Image src="/logo.png" alt="ADPT" width={24} height={24} priority />
            ADPT
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const badge = badges[item.href];
            const hasBadge = typeof badge === "number" && badge > 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-foreground"
                )}
              >
                {Icon && <Icon className="h-5 w-5 shrink-0" />}
                <span className="flex-1">{item.title}</span>
                {hasBadge && (
                  <span className="rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-background">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
