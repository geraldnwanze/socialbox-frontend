"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CannedResponse } from "@/lib/types";

export interface CannedResponseInput {
  title: string;
  shortcut: string;
  content: string;
}

export function useCannedResponses() {
  return useQuery({
    queryKey: ["canned-responses"],
    queryFn: () => api.get<CannedResponse[]>("/canned-responses"),
    // Replies change rarely; the composer reads this on every conversation, so avoid refetch churn.
    staleTime: 60_000,
  });
}

export function useCreateCannedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CannedResponseInput) => api.post<CannedResponse>("/canned-responses", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canned-responses"] }),
  });
}

export function useUpdateCannedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: Partial<CannedResponseInput> & { id: string }) =>
      api.patch<CannedResponse>(`/canned-responses/${id}`, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canned-responses"] }),
  });
}

export function useDeleteCannedResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/canned-responses/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["canned-responses"] }),
  });
}
