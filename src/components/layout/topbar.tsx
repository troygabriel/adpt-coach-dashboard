"use client";

import { useRouter } from "next/navigation";
import { Bell, Menu, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Coach } from "@/types";

interface TopbarProps {
  coach: Coach | null;
  onMenuClick: () => void;
}

export function Topbar({ coach, onMenuClick }: TopbarProps) {
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/sign-in");
    router.refresh();
  }

  const initials = coach?.display_name
    ? coach.display_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "CO";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-sm">
      {/* Left: mobile menu */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onMenuClick}
        className="lg:hidden text-muted-foreground"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="flex-1" />

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="text-muted-foreground relative">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 px-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback className="bg-primary/15 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium text-foreground sm:inline">
                {coach?.display_name || "Coach"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-card border-border">
            <DropdownMenuItem
              className="text-muted-foreground cursor-pointer"
              onClick={() => router.push("/settings")}
            >
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border" />
            <DropdownMenuItem
              className="text-destructive cursor-pointer"
              onClick={handleSignOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
