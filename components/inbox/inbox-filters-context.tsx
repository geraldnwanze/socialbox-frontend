"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { ConversationFilters } from "@/hooks/use-conversations";
import type { ConversationPriority, ConversationStatus, InboxView, InboxViewFilters } from "@/lib/types";

/** The choices made in the sidebar (which inbox you are looking at). */
export interface SidebarFilter {
  unreadOnly?: boolean;
  assignedTo?: string;
  channelConnectionId?: string;
}

interface Extras {
  priority?: ConversationPriority;
  tagId?: string;
  sort?: "newest" | "oldest";
}

interface InboxFiltersValue {
  filters: ConversationFilters;
  status: ConversationStatus;
  setStatus: (s: ConversationStatus) => void;
  search: string;
  setSearch: (s: string) => void;
  sidebar: SidebarFilter;
  setSidebar: (f: SidebarFilter) => void;
  /** Picking an inbox in the sidebar starts fresh: it also clears priority, tag and order. */
  selectInbox: (f: SidebarFilter) => void;
  extras: Extras;
  setExtras: (e: Extras) => void;
  activeViewId: string | null;
  applyView: (view: InboxView) => void;
  /** True when anything beyond "open conversations, newest first" is set. */
  isCustomised: boolean;
  /** What a saved view should remember right now. */
  snapshot: () => InboxViewFilters;
  reset: () => void;
}

const InboxFiltersContext = createContext<InboxFiltersValue | null>(null);

export function InboxFiltersProvider({ children }: { children: ReactNode }) {
  const [status, setStatusState] = useState<ConversationStatus>("OPEN");
  const [search, setSearchState] = useState("");
  const [sidebar, setSidebarState] = useState<SidebarFilter>({});
  const [extras, setExtrasState] = useState<Extras>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  // Any manual change means you're no longer looking at the saved view as it was saved.
  const setStatus = useCallback((s: ConversationStatus) => {
    setStatusState(s);
    setActiveViewId(null);
  }, []);
  const setSearch = useCallback((s: string) => {
    setSearchState(s);
    setActiveViewId(null);
  }, []);
  const setSidebar = useCallback((f: SidebarFilter) => {
    setSidebarState(f);
    setActiveViewId(null);
  }, []);
  const selectInbox = useCallback((f: SidebarFilter) => {
    setSidebarState(f);
    setExtrasState({});
    setActiveViewId(null);
  }, []);
  const setExtras = useCallback((e: Extras) => {
    setExtrasState(e);
    setActiveViewId(null);
  }, []);

  const applyView = useCallback((view: InboxView) => {
    const f = view.filters;
    setStatusState(f.status ?? "OPEN");
    setSearchState(f.search ?? "");
    setSidebarState({
      ...(f.unreadOnly && { unreadOnly: true }),
      ...(f.assignedTo && { assignedTo: f.assignedTo }),
      ...(f.channelConnectionId && { channelConnectionId: f.channelConnectionId }),
    });
    setExtrasState({
      ...(f.priority && { priority: f.priority }),
      ...(f.tagId && { tagId: f.tagId }),
      ...(f.sort && { sort: f.sort }),
    });
    setActiveViewId(view.id);
  }, []);

  const reset = useCallback(() => {
    setStatusState("OPEN");
    setSearchState("");
    setSidebarState({});
    setExtrasState({});
    setActiveViewId(null);
  }, []);

  const filters = useMemo<ConversationFilters>(() => {
    const f: ConversationFilters = { status, ...sidebar, ...extras };
    if (search.trim()) f.search = search.trim();
    return f;
  }, [status, search, sidebar, extras]);

  const snapshot = useCallback((): InboxViewFilters => ({ ...filters }), [filters]);

  const isCustomised =
    status !== "OPEN" || !!search.trim() || Object.keys(sidebar).length > 0 || Object.keys(extras).length > 0;

  return (
    <InboxFiltersContext.Provider
      value={{
        filters,
        status,
        setStatus,
        search,
        setSearch,
        sidebar,
        setSidebar,
        selectInbox,
        extras,
        setExtras,
        activeViewId,
        applyView,
        isCustomised,
        snapshot,
        reset,
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
