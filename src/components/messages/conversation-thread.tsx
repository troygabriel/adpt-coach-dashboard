"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  message_type: string;
  read_at: string | null;
  created_at: string;
  pending?: boolean;
};

type Row =
  | { kind: "separator"; key: string; label: string }
  | { kind: "message"; key: string; message: Message };

interface Props {
  coachId: string;
  conversationId: string;
  clientId: string;
  clientName: string;
}

function formatTimestamp(d: string): string {
  return new Date(d).toLocaleString([], {
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    day: "numeric",
  });
}

function dayLabel(date: Date): string {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  const diffDays = Math.floor((today.getTime() - date.getTime()) / 86400000);
  if (diffDays < 7)
    return date.toLocaleDateString([], { weekday: "long" });
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildRows(messages: Message[]): Row[] {
  const rows: Row[] = [];
  let lastDay = "";
  for (const m of messages) {
    const d = new Date(m.created_at);
    const dayKey = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKey !== lastDay) {
      lastDay = dayKey;
      rows.push({ kind: "separator", key: `sep-${dayKey}`, label: dayLabel(d) });
    }
    rows.push({ kind: "message", key: m.id, message: m });
  }
  return rows;
}

export function ConversationThread({
  coachId,
  conversationId,
  clientId,
  clientName,
}: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime subscription
  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load messages", { description: error.message });
        setLoading(false);
        return;
      }
      setMessages((data ?? []) as Message[]);
      setLoading(false);
    }
    load();

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => {
            const next = payload.new as Message;
            if (prev.some((m) => m.id === next.id)) return prev;
            return [...prev, next];
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [conversationId, supabase]);

  // Mark unread messages addressed to me as read
  useEffect(() => {
    const unreadIds = messages
      .filter((m) => m.recipient_id === coachId && m.read_at == null)
      .map((m) => m.id);
    if (unreadIds.length === 0) return;
    void (async () => {
      const { error } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .in("id", unreadIds);
      if (!error) {
        // Refresh the conversation list so the unread badge updates
        router.refresh();
      }
    })();
  }, [messages, coachId, supabase, router]);

  const rows = useMemo(() => buildRows(messages), [messages]);

  // Autoscroll to the latest message
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [rows.length]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text) return;

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimistic: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: coachId,
      recipient_id: clientId,
      content: text,
      message_type: "text",
      read_at: null,
      created_at: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    setSending(true);

    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: coachId,
        recipient_id: clientId,
        content: text,
        message_type: "text",
      })
      .select("*")
      .single();
    setSending(false);
    if (error || !inserted) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setDraft((d) => (d.length === 0 ? text : d));
      toast.error("Couldn't send", { description: error?.message });
      return;
    }

    const real = inserted as Message;
    setMessages((prev) => {
      const withoutTemp = prev.filter((m) => m.id !== tempId);
      if (withoutTemp.some((m) => m.id === real.id)) return withoutTemp;
      return [...withoutTemp, real];
    });
  }, [draft, supabase, conversationId, coachId, clientId]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{clientName}</p>
          <p className="text-xs text-muted-foreground">
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground">
            No messages yet. Say hi.
          </p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              if (row.kind === "separator") {
                return (
                  <p
                    key={row.key}
                    className="py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    {row.label}
                  </p>
                );
              }
              const m = row.message;
              const mine = m.sender_id === coachId;
              return (
                <div
                  key={row.key}
                  className={cn("flex", mine ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm",
                      mine
                        ? "bg-foreground text-background rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm",
                      m.pending && "opacity-60"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-[10px]",
                        mine ? "text-background/70" : "text-muted-foreground"
                      )}
                    >
                      {formatTimestamp(m.created_at)}
                      {mine && m.pending ? " · Sending…" : ""}
                      {mine && !m.pending && m.read_at ? " · Read" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-md border bg-input px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            style={{ minHeight: 38, maxHeight: 120 }}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={sending || !draft.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
