"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { useConversations } from "@/hooks/use-conversations";
import { useInboxFilters } from "./inbox-filters-context";
import { ChannelDot } from "@/components/channel-badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
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

export function ConversationList() {
  const { filters, search, setSearch } = useInboxFilters();
  const [status, setStatus] = useState<ConversationStatus>("OPEN");
  const params = useParams<{ conversationId?: string }>();

  const { data, isLoading } = useConversations({
    ...filters,
    status,
  });

  const conversations = data?.items ?? [];

  return (
    <div className="flex w-80 shrink-0 flex-col border-r">
      <div className="space-y-2 border-b p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
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
      </div>

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

        {conversations.map((conversation) => {
          const isActive = params.conversationId === conversation.id;
          const name = conversation.contact?.displayName ?? "Unknown";
          return (
            <Link
              key={conversation.id}
              href={`/inbox/${conversation.id}`}
              className={cn(
                "flex gap-3 border-b px-3 py-3 transition-colors hover:bg-accent/60",
                isActive && "bg-accent",
              )}
            >
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
            </Link>
          );
        })}
      </div>
    </div>
  );
}
