"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { ConversationFilters } from "@/hooks/use-conversations";

export type QuickFilter = "all" | "unread" | "assigned-to-me";

interface InboxFiltersValue {
  quickFilter: QuickFilter;
  setQuickFilter: (f: QuickFilter) => void;
  channelConnectionId: string | null;
  setChannelConnectionId: (id: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  filters: ConversationFilters;
}

const InboxFiltersContext = createContext<InboxFiltersValue | null>(null);

export function InboxFiltersProvider({ children }: { children: ReactNode }) {
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [channelConnectionId, setChannelConnectionId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filters = useMemo<ConversationFilters>(() => {
    const base: ConversationFilters = {};
    if (channelConnectionId) base.channelConnectionId = channelConnectionId;
    if (search.trim()) base.search = search.trim();
    if (quickFilter === "unread") base.unreadOnly = true;
    if (quickFilter === "assigned-to-me") base.assignedTo = "me";
    return base;
  }, [quickFilter, channelConnectionId, search]);

  return (
    <InboxFiltersContext.Provider
      value={{
        quickFilter,
        setQuickFilter,
        channelConnectionId,
        setChannelConnectionId,
        search,
        setSearch,
        filters,
      }}
    >
      {children}
    </InboxFiltersContext.Provider>
  );
}

export function useInboxFilters() {
  const ctx = useContext(InboxFiltersContext);
  if (!ctx) throw new Error("useInboxFilters must be used within InboxFiltersProvider");
  return ctx;
}
