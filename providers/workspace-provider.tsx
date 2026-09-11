"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "@/lib/auth-storage";
import type { Workspace } from "@/lib/types";
import { useAuth } from "./auth-provider";

interface WorkspaceContextValue {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  isLoading: boolean;
  switchWorkspace: (workspaceId: string) => void;
  refetch: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    // localStorage isn't available during SSR, so the active workspace id can only be read
    // after mount — this can't be a lazy useState initializer without risking a hydration
    // mismatch between the server render and the client's first render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveId(getActiveWorkspaceId());
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.get<Workspace[]>("/workspaces", { skipWorkspaceHeader: true }),
    enabled: !!user,
  });

  const workspaces = useMemo(() => data ?? [], [data]);
  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [workspaces, activeId],
  );

  function switchWorkspace(workspaceId: string) {
    setActiveWorkspaceId(workspaceId);
    setActiveId(workspaceId);
  }

  return (
    <WorkspaceContext.Provider
      value={{ workspaces, activeWorkspace, isLoading, switchWorkspace, refetch: () => refetch() }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace must be used within WorkspaceProvider");
  return ctx;
}
