"use client";

import { useRouter } from "next/navigation";
import { ConversationList, type ConversationPreview } from "./conversation-list";
import { ConversationThread } from "./conversation-thread";

interface Props {
  coachId: string;
  conversations: ConversationPreview[];
  selectedConversationId: string | null;
}

export function MessagesClient({
  coachId,
  conversations,
  selectedConversationId,
}: Props) {
  const router = useRouter();

  const selected =
    conversations.find((c) => c.id === selectedConversationId) ?? null;

  function handleSelect(id: string) {
    router.replace(`/messages?c=${id}`);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden rounded-lg border bg-card">
      <div className="flex w-full max-w-xs shrink-0 flex-col border-r sm:max-w-sm">
        <ConversationList
          conversations={conversations}
          selectedId={selected?.id ?? null}
          onSelect={handleSelect}
        />
      </div>
      <div className="flex flex-1 flex-col">
        {selected ? (
          <ConversationThread
            key={selected.id}
            coachId={coachId}
            conversationId={selected.id}
            clientId={selected.clientId}
            clientName={selected.clientName}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            {conversations.length === 0
              ? "No conversations yet. Add a client and a conversation will be created automatically."
              : "Select a conversation."}
          </div>
        )}
      </div>
    </div>
  );
}
