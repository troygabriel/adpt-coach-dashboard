"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { ClientContextSidebar } from "./client-context-sidebar";
import { MessageNotifier } from "@/components/messages/message-notifier";
import { cn } from "@/lib/utils";

export function ClientMirrorShell({
  coachId,
  clientId,
  clientName,
  children,
}: {
  coachId: string;
  clientId: string;
  clientName: string | null;
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <MessageNotifier coachId={coachId} />
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
          collapsed ? "lg:ml-[68px]" : "lg:ml-[240px]",
        )}
      >
        {/* Breadcrumb — primary "back to overview" affordance. Lives at the
            top of the main column where the eye lands first, not buried in
            the sidebar footer. */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 border-b border-border bg-background/80 px-4 py-2 text-sm md:px-6 lg:px-8"
        >
          <Link
            href="/clients"
            className="inline-flex items-center gap-1.5 rounded px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
            Clients
          </Link>
          <ChevronRight
            aria-hidden="true"
            className="h-3.5 w-3.5 text-muted-foreground/60"
          />
          <span className="font-medium text-foreground">
            {clientName ?? "Client"}
          </span>
        </nav>

        <main className="flex-1 p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
