"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { InboxView, InboxViewFilters } from "@/lib/types";

export function useInboxViews() {
  return useQuery({
    queryKey: ["inbox-views"],
    queryFn: () => api.get<InboxView[]>("/inbox-views"),
  });
}

export function useCreateInboxView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; filters: InboxViewFilters; shared?: boolean }) =>
      api.post<InboxView>("/inbox-views", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-views"] }),
  });
}

export function useUpdateInboxView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: { id: string; name?: string; filters?: InboxViewFilters; shared?: boolean }) =>
      api.patch<InboxView>(`/inbox-views/${id}`, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-views"] }),
  });
}

export function useDeleteInboxView() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inbox-views/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-views"] }),
  });
}
