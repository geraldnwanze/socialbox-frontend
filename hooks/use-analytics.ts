"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AnalyticsOverview } from "@/lib/types";

export function useAnalyticsOverview(days: 7 | 30 | 90, enabled = true) {
  return useQuery({
    queryKey: ["analytics", days],
    queryFn: () => api.get<AnalyticsOverview>(`/analytics/overview?days=${days}`),
    enabled,
    staleTime: 60_000,
  });
}
