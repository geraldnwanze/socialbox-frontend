"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AiStatus, AiSummary, RewriteTone } from "@/lib/types";

/** Whether to show AI controls at all: the server has a key and an admin turned it on. */
export function useAiAvailable(): boolean {
  const { data } = useQuery({
    queryKey: ["ai-status"],
    queryFn: () => api.get<AiStatus>("/ai/status"),
    staleTime: 60_000,
  });
  return !!data?.configured && !!data.enabled;
}

export function useAiSummary() {
  return useMutation({
    mutationFn: (conversationId: string) => api.post<AiSummary>(`/ai/conversations/${conversationId}/summary`, {}),
  });
}

export function useSuggestReply() {
  return useMutation({
    mutationFn: ({ conversationId, instruction }: { conversationId: string; instruction?: string }) =>
      api.post<{ text: string }>(`/ai/conversations/${conversationId}/suggest-reply`, { instruction }),
  });
}

export function useRewrite() {
  return useMutation({
    mutationFn: ({ text, tone }: { text: string; tone: RewriteTone }) => api.post<{ text: string }>("/ai/rewrite", { text, tone }),
  });
}
