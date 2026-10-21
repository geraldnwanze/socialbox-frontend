"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useConversation } from "@/hooks/use-conversations";
import { useMarkConversationRead } from "@/hooks/use-conversations";
import { useChannels } from "@/hooks/use-channels";
import { MessageThread } from "@/components/inbox/message-thread";
import { MessageComposer } from "@/components/inbox/message-composer";
import { TypingIndicator } from "@/components/inbox/typing-indicator";
import { PresenceBar } from "@/components/inbox/presence-bar";
import { usePresenceHeartbeat } from "@/hooks/use-presence";
import { isGeneratedName } from "@/lib/canned-response-template";
import { CustomerPanel } from "@/components/inbox/customer-panel";
import { PageSpinner } from "@/components/page-spinner";

export default function ConversationPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const { data: conversation, isLoading } = useConversation(conversationId);
  const { data: channelsData } = useChannels();
  const markRead = useMarkConversationRead();
  const markedRef = useRef<string | null>(null);
  usePresenceHeartbeat(conversationId);

  useEffect(() => {
    if (conversation && conversation.unreadCount > 0 && markedRef.current !== conversation.id) {
      markedRef.current = conversation.id;
      markRead.mutate(conversation.id);
    }
  }, [conversation, markRead]);

  if (isLoading || !conversation) return <PageSpinner />;

  const capabilities = channelsData?.catalog.find((c) => c.type === conversation.channelConnection?.type)
    ?.capabilities;

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex flex-1 flex-col overflow-hidden">
        <MessageThread key={conversation.id} conversationId={conversation.id} />
        <PresenceBar conversationId={conversationId} />
        <TypingIndicator conversationId={conversation.id} name={
            isGeneratedName(conversation.contact?.displayName) ? null : conversation.contact?.displayName?.split(" ")[0]
          } />
        <MessageComposer
          conversationId={conversation.id}
          status={conversation.status}
          capabilities={capabilities}
          customerName={conversation.contact?.displayName}
        />
      </div>
      <CustomerPanel conversation={conversation} />
    </div>
  );
}
