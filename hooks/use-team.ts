"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { WorkspaceMember, WorkspaceRole } from "@/lib/types";

export function useTeamMembers() {
  return useQuery({
    queryKey: ["team-members"],
    queryFn: () => api.get<WorkspaceMember[]>("/workspace/members"),
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: WorkspaceRole }) =>
      api.post<WorkspaceMember>("/workspace/members", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: WorkspaceRole }) =>
      api.patch<WorkspaceMember>(`/workspace/members/${id}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/workspace/members/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["team-members"] }),
  });
}
