"use client";

import { useState } from "react";
import { ClientContextSidebar } from "./client-context-sidebar";
import { cn } from "@/lib/utils";

export function ClientMirrorShell({
  clientId,
  clientName,
  children,
}: {
  clientId: string;
  clientName: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <ClientContextSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((c) => !c)}
          clientId={clientId}
          clientName={clientName}
        />
      </div>
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]"
        )}
      >
        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
