"use client";

import { useChannels } from "@/hooks/use-channels";
import { useConversations } from "@/hooks/use-conversations";
import { useInboxFilters } from "./inbox-filters-context";
import { ChannelDot } from "@/components/channel-badge";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { cn } from "@/lib/utils";
import { Inbox, MailOpen, UserCheck } from "lucide-react";

function useCounts() {
  const all = useConversations({});
  const unread = useConversations({ unreadOnly: true });
  const mine = useConversations({ assignedTo: "me" });
  return {
    all: all.data?.items.length,
    unread: unread.data?.items.length,
    mine: mine.data?.items.length,
  };
}

export function FiltersSidebar() {
  const { data } = useChannels();
  const { quickFilter, setQuickFilter, channelConnectionId, setChannelConnectionId } = useInboxFilters();
  const counts = useCounts();

  const connectedChannels = data?.connected.filter((c) => c.status === "CONNECTED") ?? [];

  return (
    <aside className="flex w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-muted/20 p-3">
      <nav className="space-y-0.5">
        <FilterRow
          icon={<Inbox className="h-4 w-4" />}
          label="All"
          count={counts.all}
          active={quickFilter === "all" && !channelConnectionId}
          onClick={() => {
            setQuickFilter("all");
            setChannelConnectionId(null);
          }}
        />
        <FilterRow
          icon={<MailOpen className="h-4 w-4" />}
          label="Unread"
          count={counts.unread}
          active={quickFilter === "unread"}
          onClick={() => {
            setQuickFilter("unread");
            setChannelConnectionId(null);
          }}
        />
        <FilterRow
          icon={<UserCheck className="h-4 w-4" />}
          label="Assigned to me"
          count={counts.mine}
          active={quickFilter === "assigned-to-me"}
          onClick={() => {
            setQuickFilter("assigned-to-me");
            setChannelConnectionId(null);
          }}
        />
      </nav>

      {connectedChannels.length > 0 && (
        <div>
          <p className="mb-1 px-2 text-xs font-medium uppercase text-muted-foreground">Channels</p>
          <nav className="space-y-0.5">
            {connectedChannels.map((channel) => (
              <FilterRow
                key={channel.id}
                icon={<ChannelDot type={channel.type} />}
                label={channel.externalAccountName || CHANNEL_LABEL[channel.type]}
                active={channelConnectionId === channel.id}
                onClick={() => {
                  setChannelConnectionId(channel.id);
                  setQuickFilter("all");
                }}
              />
            ))}
          </nav>
        </div>
      )}
    </aside>
  );
}

function FilterRow({
  icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80 hover:bg-accent/60",
      )}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {typeof count === "number" && count > 0 && (
        <span className="text-xs text-muted-foreground">{count}</span>
      )}
    </button>
  );
}
