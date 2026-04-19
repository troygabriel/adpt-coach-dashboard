"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Dumbbell,
  MessageSquare,
  BarChart3,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/constants";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Dumbbell,
  MessageSquare,
  BarChart3,
  Settings,
};

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="left" className="w-[240px] bg-sidebar border-sidebar-border p-0">
        <SheetHeader className="h-14 border-b border-sidebar-border px-4 flex justify-center">
          <SheetTitle className="text-lg font-semibold text-foreground">
            <span className="text-primary">ADPT</span>
          </SheetTitle>
        </SheetHeader>
        <nav className="space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = iconMap[item.icon];
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

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
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
