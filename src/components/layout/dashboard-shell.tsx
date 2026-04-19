"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";
import { cn } from "@/lib/utils";
import type { Coach } from "@/types";

interface DashboardShellProps {
  coach: Coach | null;
  children: React.ReactNode;
}

export function DashboardShell({ coach, children }: DashboardShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile nav */}
      <MobileNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
      />

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          sidebarCollapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
        )}
      >
        <Topbar
          coach={coach}
          onMenuClick={() => setMobileNavOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
