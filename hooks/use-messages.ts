"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Message, MessageType, Paginated } from "@/lib/types";

export function useMessages(conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    queryFn: ({ pageParam }: { pageParam: string | null }) =>
      api.get<Paginated<Message>>(
        `/conversations/${conversationId}/messages${pageParam ? `?cursor=${encodeURIComponent(pageParam)}` : ""}`,
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!conversationId,
  });
}

export interface SendMessageInput {
  conversationId: string;
  type: MessageType;
  text?: string;
  attachment?: { storageKey: string; mimeType: string; fileName?: string };
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, ...body }: SendMessageInput) =>
      api.post<Message>(`/conversations/${conversationId}/messages`, body),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useRetryMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId }: { messageId: string; conversationId: string }) =>
      api.post<Message>(`/messages/${messageId}/retry`),
    onSuccess: (_, { conversationId }) => {
      queryClient.invalidateQueries({ queryKey: ["messages", conversationId] });
    },
  });
}

export function useRequestUploadUrl() {
  return useMutation({
    mutationFn: ({ fileName, mimeType }: { fileName: string; mimeType: string }) =>
      api.post<{ storageKey: string; uploadUrl: string }>("/attachments/upload-url", {
        fileName,
        mimeType,
      }),
  });
}
