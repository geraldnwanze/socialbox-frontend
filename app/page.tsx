"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { getActiveWorkspaceId } from "@/lib/auth-storage";
import { PageSpinner } from "@/components/page-spinner";

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    router.replace(getActiveWorkspaceId() ? "/inbox" : "/workspaces");
  }, [isLoading, user, router]);

  return <PageSpinner />;
}
