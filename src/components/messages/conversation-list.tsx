"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export type ConversationPreview = {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail: string;
  lastMessage: {
    content: string | null;
    messageType: string;
    createdAt: string;
    senderIsMe: boolean;
  } | null;
  unread: number;
  lastMessageAt: string | null;
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatTime(d: string | null): string {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 7 * 86400000) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function previewText(p: ConversationPreview): string {
  if (!p.lastMessage) return "No messages yet";
  if (p.lastMessage.messageType !== "text") return `[${p.lastMessage.messageType}]`;
  const text = p.lastMessage.content ?? "";
  const prefix = p.lastMessage.senderIsMe ? "You: " : "";
  return prefix + text;
}

interface Props {
  conversations: ConversationPreview[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ConversationList({ conversations, selectedId, onSelect }: Props) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h1 className="text-lg font-semibold">Messages</h1>
      </div>
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">No conversations.</p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={cn(
                "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition-colors",
                selectedId === c.id ? "bg-muted/60" : "hover:bg-muted/30"
              )}
            >
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-muted text-xs font-medium">
                  {getInitials(c.clientName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      c.unread > 0 ? "font-semibold" : "font-medium"
                    )}
                  >
                    {c.clientName}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatTime(c.lastMessageAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      "truncate text-xs",
                      c.unread > 0 ? "text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {previewText(c)}
                  </span>
                  {c.unread > 0 && (
                    <span className="ml-2 inline-flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-medium text-background">
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
