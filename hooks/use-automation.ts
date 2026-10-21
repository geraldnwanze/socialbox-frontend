"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AutomationAction, AutomationCondition, AutomationRule } from "@/lib/types";

export interface AutomationRuleInput {
  name: string;
  enabled?: boolean;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

export function useAutomationRules(enabled = true) {
  return useQuery({
    queryKey: ["automation-rules"],
    queryFn: () => api.get<AutomationRule[]>("/automation-rules"),
    enabled,
  });
}

export function useCreateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AutomationRuleInput) => api.post<AutomationRule>("/automation-rules", input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}

export function useUpdateAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...changes }: Partial<AutomationRuleInput> & { id: string }) =>
      api.patch<AutomationRule>(`/automation-rules/${id}`, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}

export function useDeleteAutomationRule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/automation-rules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}

/** Rules run top to bottom; the server returns the list in its new order. */
export function useReorderAutomationRules() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[]) => api.post<AutomationRule[]>("/automation-rules/reorder", { ids }),
    onSuccess: (rules) => queryClient.setQueryData(["automation-rules"], rules),
    onError: () => queryClient.invalidateQueries({ queryKey: ["automation-rules"] }),
  });
}
