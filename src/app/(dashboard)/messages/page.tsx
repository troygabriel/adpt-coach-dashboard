import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesClient } from "@/components/messages/messages-client";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c: selectedConversationId } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const { data: convos } = await supabase
    .from("conversations")
    .select("id, coach_id, client_id, last_message_at, created_at")
    .eq("coach_id", user.id)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const conversations = convos ?? [];
  const clientIds = conversations.map((c) => c.client_id);

  const { data: profiles } = clientIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, first_name, email")
        .in("id", clientIds)
    : { data: [] };

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      p as { id: string; first_name: string | null; email: string | null },
    ])
  );

  const previews = await Promise.all(
    conversations.map(async (c) => {
      const [{ data: last }, { count: unread }] = await Promise.all([
        supabase
          .from("messages")
          .select("content, message_type, created_at, sender_id")
          .eq("conversation_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", c.id)
          .eq("recipient_id", user.id)
          .is("read_at", null),
      ]);
      const profile = profileMap.get(c.client_id);
      return {
        id: c.id,
        clientId: c.client_id,
        clientName: profile?.first_name ?? "Client",
        clientEmail: profile?.email ?? "",
        lastMessage: last
          ? {
              content: (last.content as string | null) ?? null,
              messageType: last.message_type as string,
              createdAt: last.created_at as string,
              senderIsMe: last.sender_id === user.id,
            }
          : null,
        unread: unread ?? 0,
        lastMessageAt: c.last_message_at,
      };
    })
  );

  return (
    <MessagesClient
      coachId={user.id}
      conversations={previews}
      selectedConversationId={selectedConversationId ?? previews[0]?.id ?? null}
    />
  );
}
