"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useWorkspace } from "@/providers/workspace-provider";
import { useRealtime } from "@/hooks/use-realtime";
import { AppShell } from "@/components/app-shell";
import { PageSpinner } from "@/components/page-spinner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const { activeWorkspace, isLoading: workspaceLoading } = useWorkspace();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!workspaceLoading && !activeWorkspace) {
      router.replace("/workspaces");
    }
  }, [authLoading, user, workspaceLoading, activeWorkspace, router]);

  useRealtime();

  if (authLoading || workspaceLoading || !user || !activeWorkspace) return <PageSpinner />;

  return <AppShell>{children}</AppShell>;
}
