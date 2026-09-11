"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ChannelCatalogEntry, ChannelConnection, ChannelType } from "@/lib/types";

interface ChannelsResponse {
  connected: ChannelConnection[];
  catalog: ChannelCatalogEntry[];
}

export function useChannels() {
  return useQuery({
    queryKey: ["channels"],
    queryFn: () => api.get<ChannelsResponse>("/channels"),
  });
}

export function useConnectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, credentials }: { type: ChannelType; credentials: Record<string, unknown> }) =>
      api.post<ChannelConnection>(`/channels/${type}/connect`, { credentials }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
  });
}

export function useDisconnectChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/channels/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["channels"] }),
  });
}
