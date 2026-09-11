"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ConversationTagLink } from "@/lib/types";

export function useConversationTags(conversationId: string | null) {
  return useQuery({
    queryKey: ["conversation-tags", conversationId],
    queryFn: () => api.get<ConversationTagLink[]>(`/conversations/${conversationId}/tags`),
    enabled: !!conversationId,
  });
}
