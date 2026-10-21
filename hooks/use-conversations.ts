"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  Conversation,
  ConversationEvent,
  ConversationPriority,
  ConversationStatus,
  Paginated,
} from "@/lib/types";

export interface ConversationFilters {
  status?: ConversationStatus;
  channelConnectionId?: string;
  assignedTo?: "me" | "unassigned" | string;
  unreadOnly?: boolean;
  search?: string;
}

function toQueryString(filters: ConversationFilters) {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.channelConnectionId) params.set("channelConnectionId", filters.channelConnectionId);
  if (filters.assignedTo) params.set("assignedTo", filters.assignedTo);
  if (filters.unreadOnly) params.set("unreadOnly", "true");
  if (filters.search) params.set("search", filters.search);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function useConversations(filters: ConversationFilters) {
  return useQuery({
    queryKey: ["conversations", filters],
    queryFn: () => api.get<Paginated<Conversation>>(`/conversations${toQueryString(filters)}`),
  });
}

export function useConversation(id: string | null) {
  return useQuery({
    queryKey: ["conversation", id],
    queryFn: () => api.get<Conversation>(`/conversations/${id}`),
    enabled: !!id,
  });
}

export function useAssignConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigneeMemberId }: { id: string; assigneeMemberId: string | null }) =>
      api.post<Conversation>(`/conversations/${id}/assign`, { assigneeMemberId }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversation", conversation.id], conversation);
    },
  });
}

export function useResolveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Conversation>(`/conversations/${id}/resolve`),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversation", conversation.id], conversation);
    },
  });
}

export function useMarkConversationPending() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Conversation>(`/conversations/${id}/pending`),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversation", conversation.id], conversation);
    },
  });
}

export function useReopenConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post<Conversation>(`/conversations/${id}/reopen`),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversation", conversation.id], conversation);
    },
  });
}

export function useMarkConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.patch<Conversation>(`/conversations/${id}`, { read: true }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversation", conversation.id], conversation);
    },
  });
}

export function useAddConversationTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, tagId }: { conversationId: string; tagId: string }) =>
      api.post(`/conversations/${conversationId}/tags/${tagId}`),
    onSuccess: (_, { conversationId }) =>
      queryClient.invalidateQueries({ queryKey: ["conversation-tags", conversationId] }),
  });
}

export function useRemoveConversationTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, tagId }: { conversationId: string; tagId: string }) =>
      api.post(`/conversations/${conversationId}/tags/${tagId}/remove`),
    onSuccess: (_, { conversationId }) =>
      queryClient.invalidateQueries({ queryKey: ["conversation-tags", conversationId] }),
  });
}

export function useConversationEvents(conversationId: string) {
  return useQuery({
    queryKey: ["conversation-events", conversationId],
    queryFn: () => api.get<ConversationEvent[]>(`/conversations/${conversationId}/events`),
  });
}

export function useSetConversationPriority() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, priority }: { id: string; priority: ConversationPriority }) =>
      api.patch<Conversation>(`/conversations/${id}`, { priority }),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.setQueryData(["conversation", conversation.id], conversation);
      queryClient.invalidateQueries({ queryKey: ["conversation-events", conversation.id] });
    },
  });
}

export function useAddConversationNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => api.post(`/conversations/${id}/notes`, { text }),
    onSuccess: (_, { id }) => queryClient.invalidateQueries({ queryKey: ["conversation-events", id] }),
  });
}
