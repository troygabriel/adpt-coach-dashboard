"use client";

/**
 * Global message notifier for the coach dashboard.
 *
 * HCI principles applied (Nielsen Norman Group + Material guidelines):
 *  - Visibility of system status: title indicator updates instantly so the
 *    coach sees unread state without leaving the current page.
 *  - Recognition over recall: browser notification carries the sender + a
 *    snippet, so the coach can decide whether to break flow.
 *  - User control: notification permission is requested only after the first
 *    realtime event, never on page load — no prompt-on-arrival anti-pattern.
 *  - Anti-pattern avoidance: never notifies for messages whose conversation
 *    is the one currently open (anti-pattern: notifying about something the
 *    user is literally looking at).
 *  - Don't be annoying: the in-app toast is shown only when the user is on
 *    the dashboard but NOT on /messages. On /messages the conversation list
 *    refreshes naturally.
 */

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  message_type: string;
  created_at: string;
};

interface Props {
  coachId: string;
}

const ORIGINAL_TITLE_REF: { value: string | null } = { value: null };

function setTitleBadge(unread: number) {
  if (typeof document === "undefined") return;
  if (ORIGINAL_TITLE_REF.value === null) {
    ORIGINAL_TITLE_REF.value = document.title.replace(/^\(\d+\)\s+/, "");
  }
  const base = ORIGINAL_TITLE_REF.value;
  document.title = unread > 0 ? `(${unread > 99 ? "99+" : unread}) ${base}` : base;
}

export function MessageNotifier({ coachId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const onMessages = pathname?.startsWith("/messages") ?? false;
  const onMessagesRef = useRef(onMessages);
  useEffect(() => {
    onMessagesRef.current = onMessages;
  }, [onMessages]);

  const unreadRef = useRef(0);

  const refreshUnread = useCallback(async () => {
    const supabase = createClient();
    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", coachId)
      .is("read_at", null);
    unreadRef.current = count ?? 0;
    // Only show the badge when the coach is *not* on /messages — otherwise the
    // page itself communicates the state.
    setTitleBadge(onMessagesRef.current ? 0 : unreadRef.current);
  }, [coachId]);

  // Reset / restore the title when leaving or entering /messages.
  useEffect(() => {
    setTitleBadge(onMessages ? 0 : unreadRef.current);
  }, [onMessages]);

  // Ensure the title reverts on unmount (sign-out, etc.).
  useEffect(() => {
    return () => {
      if (ORIGINAL_TITLE_REF.value !== null) {
        document.title = ORIGINAL_TITLE_REF.value;
      }
    };
  }, []);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifier:${coachId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${coachId}`,
        },
        (payload) => {
          const m = payload.new as MessageRow;
          unreadRef.current += 1;

          // If the coach is on /messages, the page-level subscription handles
          // the rendering — don't double-notify.
          if (onMessagesRef.current) return;

          setTitleBadge(unreadRef.current);

          const preview =
            m.message_type === "text"
              ? (m.content ?? "").slice(0, 140)
              : `[${m.message_type}]`;

          // Respect document visibility: when hidden, prefer a system-level
          // browser notification (if permission is granted). When visible,
          // surface an in-app toast.
          const isHidden =
            typeof document !== "undefined" && document.hidden;

          if (isHidden) {
            if (
              typeof Notification !== "undefined" &&
              Notification.permission === "granted"
            ) {
              try {
                const n = new Notification("New message", {
                  body: preview || "Tap to read",
                  tag: m.conversation_id,
                  silent: false,
                });
                n.onclick = () => {
                  window.focus();
                  router.push(`/messages?c=${m.conversation_id}`);
                };
              } catch {
                // Some browsers throw on Notification() outside service worker
                // context; degrade silently.
              }
            } else if (
              typeof Notification !== "undefined" &&
              Notification.permission === "default"
            ) {
              // Lazy-request permission on first incoming message. Fire-and-forget;
              // next message will use the granted permission.
              void Notification.requestPermission().catch(() => undefined);
            }
            return;
          }

          // In-app toast with deep link.
          toast.message("New message", {
            description: preview || undefined,
            action: {
              label: "Open",
              onClick: () => router.push(`/messages?c=${m.conversation_id}`),
            },
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `recipient_id=eq.${coachId}`,
        },
        () => {
          // mark-as-read or content edit — re-derive truth from server.
          void refreshUnread();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [coachId, router, refreshUnread]);

  return null;
}
