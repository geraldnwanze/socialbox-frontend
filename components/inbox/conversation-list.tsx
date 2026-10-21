"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { useConversationList } from "@/hooks/use-conversations";
import { useInboxFilters } from "./inbox-filters-context";
import { BulkActionBar } from "./bulk-action-bar";
import { InboxFilterMenu } from "./inbox-filter-menu";
import { ViewerBadges } from "@/components/inbox/presence-bar";
import { ChannelDot } from "@/components/channel-badge";
import { PRIORITY_BADGE_CLASS, PRIORITY_LABEL } from "@/lib/priority";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CheckSquare, Loader2, Menu, Search } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FiltersSidebar } from "./filters-sidebar";
import type { ConversationStatus } from "@/lib/types";

function initialsOf(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ConversationList({ className }: { className?: string }) {
  const { filters, status, setStatus, search, setSearch } = useInboxFilters();
  const params = useParams<{ conversationId?: string }>();
  const [selecting, setSelecting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [rawSelected, setRawSelected] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<number | null>(null);

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useConversationList(filters);
  const conversations = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);

  // Only conversations still in the list stay selected: a different filter, or ones that were just
  // resolved or reassigned away, drop out on their own.
  const selected = useMemo(() => {
    const present = new Set(conversations.map((c) => c.id));
    return new Set([...rawSelected].filter((id) => present.has(id)));
  }, [rawSelected, conversations]);
  useEffect(() => {
    if (!selecting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setRawSelected(new Set());
        setSelecting(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selecting]);

  function toggle(index: number, shiftKey: boolean) {
    setRawSelected(() => {
      const prev = selected;
      const next = new Set(prev);
      const id = conversations[index].id;
      if (shiftKey && lastClicked !== null) {
        // Shift-click selects the whole range between the two clicks.
        const [from, to] = [Math.min(lastClicked, index), Math.max(lastClicked, index)];
        const turnOn = !prev.has(id);
        for (let i = from; i <= to; i++) {
          if (turnOn) next.add(conversations[i].id);
          else next.delete(conversations[i].id);
        }
      } else if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setLastClicked(index);
  }

  const allSelected = conversations.length > 0 && selected.size === conversations.length;

  return (
    <div className={cn("flex w-full shrink-0 flex-col md:w-80 md:border-r", className)}>
      <div className="space-y-2 border-b p-3">
        <div className="relative flex items-center gap-2">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger
              render={<Button variant="outline" size="icon" className="shrink-0 lg:hidden" aria-label="Inboxes and views" />}
            >
              <Menu className="h-4 w-4" />
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="sr-only">Inboxes and views</SheetTitle>
              <FiltersSidebar className="w-full flex-1 border-r-0 bg-transparent pt-12" onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
          <div className="relative min-w-0 flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          </div>
        </div>
        <Tabs value={status} onValueChange={(v) => setStatus(v as ConversationStatus)}>
          <TabsList className="w-full">
            <TabsTrigger value="OPEN" className="flex-1">
              Open
            </TabsTrigger>
            <TabsTrigger value="PENDING" className="flex-1">
              Pending
            </TabsTrigger>
            <TabsTrigger value="RESOLVED" className="flex-1">
              Resolved
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-start justify-between gap-2">
          <InboxFilterMenu />
          <Button
            variant={selecting ? "secondary" : "ghost"}
            size="sm"
            className="h-7 shrink-0 gap-1.5 px-2 text-xs"
            aria-pressed={selecting}
            onClick={() => {
              setSelecting((s) => !s);
              setRawSelected(new Set());
            }}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Select
          </Button>
        </div>
      </div>

      {selecting && selected.size > 0 && (
        <BulkActionBar
          selectedIds={[...selected]}
          status={status}
          onClear={() => setRawSelected(new Set())}
          onDone={(failed) => {
            setRawSelected(new Set(failed));
            if (failed.length === 0) setSelecting(false);
          }}
        />
      )}
      {selecting && conversations.length > 0 && (
        <label className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5"
            checked={allSelected}
            onChange={() => setRawSelected(allSelected ? new Set() : new Set(conversations.map((c) => c.id)))}
          />
          {allSelected ? "Clear selection" : `Select all ${conversations.length} loaded${hasNextPage ? " (more below)" : ""}`}
        </label>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="space-y-3 p-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {!isLoading && conversations.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-1 p-8 text-center">
            <p className="font-medium">You&apos;re all caught up.</p>
            <p className="text-sm text-muted-foreground">New customer messages will appear here.</p>
          </div>
        )}

        {conversations.map((conversation, index) => {
          const isActive = params.conversationId === conversation.id;
          const name = conversation.contact?.displayName ?? "Unknown";
          const isSelected = selected.has(conversation.id);
          const rowClass = cn(
            "flex w-full gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-accent/60",
            (isActive && !selecting) && "bg-accent",
            isSelected && "bg-accent/70",
          );
          const content = (
            <>
              {selecting && (
                <input
                  type="checkbox"
                  readOnly
                  tabIndex={-1}
                  aria-label={`Select ${name}`}
                  checked={isSelected}
                  className="mt-2.5 h-4 w-4 shrink-0"
                />
              )}
              <div className="relative shrink-0">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initialsOf(name)}</AvatarFallback>
                </Avatar>
                {conversation.channelConnection && (
                  <ChannelDot
                    type={conversation.channelConnection.type}
                    className="absolute -bottom-0.5 -right-0.5 ring-2 ring-background"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className={cn("truncate text-sm", conversation.unreadCount > 0 ? "font-semibold" : "font-medium")}>
                    {name}
                  </p>
                  {PRIORITY_BADGE_CLASS[conversation.priority] && (
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase",
                        PRIORITY_BADGE_CLASS[conversation.priority],
                      )}
                    >
                      {PRIORITY_LABEL[conversation.priority]}
                    </span>
                  )}
                  <ViewerBadges conversationId={conversation.id} />
                  {conversation.lastMessageAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDistanceToNowStrict(new Date(conversation.lastMessageAt), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm text-muted-foreground">
                    {conversation.lastMessagePreview ?? "No messages yet"}
                  </p>
                  {conversation.unreadCount > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-medium text-primary-foreground">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </>
          );
          return selecting ? (
            <button
              key={conversation.id}
              type="button"
              aria-pressed={isSelected}
              onClick={(e) => toggle(index, e.shiftKey)}
              className={rowClass}
            >
              {content}
            </button>
          ) : (
            <Link key={conversation.id} href={`/inbox/${conversation.id}`} className={rowClass}>
              {content}
            </Link>
          );
        })}

        {hasNextPage && (
          <div className="flex justify-center p-3">
            <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
              {isFetchingNextPage && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Load more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
