"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createSocket } from "@/lib/socket";
import { useWorkspace } from "@/providers/workspace-provider";
import type { Conversation, Message, Notification } from "@/lib/types";

/**
 * Bridges Socket.IO events into the TanStack Query cache. Mount once near the root of the
 * authenticated app (see app/(app)/layout equivalent) — every screen reading conversations/
 * messages/notifications via useQuery picks up updates automatically through cache invalidation.
 */
export function useRealtime() {
  const { activeWorkspace } = useWorkspace();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!activeWorkspace) return;

    const socket = createSocket(activeWorkspace.id);

    const invalidateConversations = () =>
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

    // Realtime payloads carry the bare Conversation row (no relations) — always invalidate
    // rather than writing them straight into the cache, so screens refetch the full shape
    // (contact, channelConnection, assignee) from the REST endpoint instead of losing it.
    const invalidateConversation = (conversation: Conversation) => {
      invalidateConversations();
      queryClient.invalidateQueries({ queryKey: ["conversation", conversation.id] });
    };

    socket.on("conversation.created", invalidateConversations);
    socket.on("conversation.updated", invalidateConversation);
    socket.on("conversation.assigned", invalidateConversation);
    socket.on("conversation.resolved", invalidateConversation);

    socket.on("message.created", (message: Message) => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.conversationId] });
      invalidateConversations();
    });
    socket.on("message.updated", (message: Message) => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.conversationId] });
    });
    socket.on("message.status_changed", (message: Message) => {
      queryClient.invalidateQueries({ queryKey: ["messages", message.conversationId] });
    });

    socket.on("notification.created", (notification: Notification) => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      if (notification.type === "CONVERSATION_ASSIGNED") {
        toast("A conversation was assigned to you");
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeWorkspace, queryClient]);
}
