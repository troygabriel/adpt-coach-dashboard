"use client";

import { useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "./confirm-dialog";
import { cn } from "@/lib/utils";

export type RowAction = {
  id: string;
  label: string;
  icon: LucideIcon;
  onSelect: () => void | Promise<void>;
  destructive?: boolean;
  /** If provided, clicking opens a confirm dialog before calling onSelect. */
  confirm?: {
    title: string;
    description: string;
    actionLabel: string;
  };
};

export function RowActions({
  actions,
  ariaLabel = "Open actions",
  align = "end",
}: {
  actions: RowAction[];
  ariaLabel?: string;
  align?: "start" | "center" | "end";
}) {
  const [pending, setPending] = useState<RowAction | null>(null);
  const [running, setRunning] = useState(false);

  const trigger = (action: RowAction) => {
    if (action.confirm) {
      setPending(action);
    } else {
      void action.onSelect();
    }
  };

  const runConfirmed = async () => {
    if (!pending) return;
    setRunning(true);
    try {
      await pending.onSelect();
    } finally {
      setRunning(false);
      setPending(null);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal aria-hidden="true" className="h-4 w-4" />
            <span className="sr-only">{ariaLabel}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align={align}
          onClick={(e) => e.stopPropagation()}
        >
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <DropdownMenuItem
                key={action.id}
                className={cn(
                  "cursor-pointer",
                  action.destructive && "text-destructive focus:text-destructive"
                )}
                onSelect={(e) => {
                  e.preventDefault();
                  trigger(action);
                }}
              >
                <Icon className="mr-2 h-4 w-4" aria-hidden="true" />
                {action.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={!!pending}
        onOpenChange={(open) => !open && !running && setPending(null)}
        title={pending?.confirm?.title ?? ""}
        description={pending?.confirm?.description ?? ""}
        actionLabel={pending?.confirm?.actionLabel ?? "Confirm"}
        destructive={pending?.destructive}
        pending={running}
        onConfirm={runConfirmed}
      />
    </>
  );
}
