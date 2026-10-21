"use client";

import { toast } from "sonner";
import { useChannels } from "@/hooks/use-channels";
import { useConversations } from "@/hooks/use-conversations";
import { useDeleteInboxView, useInboxViews, useUpdateInboxView } from "@/hooks/use-inbox-views";
import { useInboxFilters } from "./inbox-filters-context";
import { ChannelDot } from "@/components/channel-badge";
import { CHANNEL_LABEL } from "@/lib/channel-meta";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Inbox, MailOpen, MoreHorizontal, Users, UserCheck, Bookmark } from "lucide-react";

function useCounts() {
  const all = useConversations({ status: "OPEN" });
  const unread = useConversations({ unreadOnly: true });
  const mine = useConversations({ assignedTo: "me" });
  // Only the first page is loaded, so a full page means "at least this many".
  const fmt = (q: typeof all) => {
    const n = q.data?.items.length;
    if (n === undefined) return undefined;
    return q.data?.nextCursor ? `${n}+` : n;
  };
  return { all: fmt(all), unread: fmt(unread), mine: fmt(mine) };
}

export function FiltersSidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
  const { data } = useChannels();
  const { data: views } = useInboxViews();
  const { sidebar, selectInbox, activeViewId, applyView, snapshot, search, extras } = useInboxFilters();
  const updateView = useUpdateInboxView();
  const deleteView = useDeleteInboxView();
  const counts = useCounts();

  const connectedChannels = data?.connected.filter((c) => c.status === "CONNECTED") ?? [];
  const plain = !activeViewId && !search && !Object.keys(extras).length;
  const none = Object.keys(sidebar).length === 0;
  const go = (fn: () => void) => {
    fn();
    onNavigate?.();
  };

  return (
    <aside className={cn("flex w-56 shrink-0 flex-col gap-6 overflow-y-auto border-r bg-muted/20 p-3", className)}>
      <nav className="space-y-0.5">
        <FilterRow
          icon={<Inbox className="h-4 w-4" />}
          label="All"
          count={counts.all}
          active={plain && none}
          onClick={() => go(() => selectInbox({}))}
        />
        <FilterRow
          icon={<MailOpen className="h-4 w-4" />}
          label="Unread"
          count={counts.unread}
          active={plain && sidebar.unreadOnly === true && Object.keys(sidebar).length === 1}
          onClick={() => go(() => selectInbox({ unreadOnly: true }))}
        />
        <FilterRow
          icon={<UserCheck className="h-4 w-4" />}
          label="Assigned to me"
          count={counts.mine}
          active={plain && sidebar.assignedTo === "me" && Object.keys(sidebar).length === 1}
          onClick={() => go(() => selectInbox({ assignedTo: "me" }))}
        />
      </nav>

      {views && views.length > 0 && (
        <div>
          <p className="mb-1 px-2 text-xs font-medium uppercase text-muted-foreground">Views</p>
          <nav className="space-y-0.5">
            {views.map((view) => (
              <div key={view.id} className="group relative">
                <FilterRow
                  icon={view.shared ? <Users className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  label={view.name}
                  active={activeViewId === view.id}
                  onClick={() => go(() => applyView(view))}
                  title={view.shared ? `Shared by ${view.ownerName ?? "a teammate"}` : "Only you can see this view"}
                />
                {view.canEdit && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          aria-label={`Options for ${view.name}`}
                          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground opacity-0 hover:bg-background group-hover:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      }
                    />
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          updateView.mutate(
                            { id: view.id, filters: snapshot() },
                            { onSuccess: () => toast.success(`Updated "${view.name}" with the current filters`) },
                          )
                        }
                      >
                        Update with current filters
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Delete the view "${view.name}"?`)) {
                            deleteView.mutate(view.id, { onSuccess: () => toast.success("View deleted") });
                          }
                        }}
                      >
                        Delete view
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
          </nav>
        </div>
      )}

      {connectedChannels.length > 0 && (
        <div>
          <p className="mb-1 px-2 text-xs font-medium uppercase text-muted-foreground">Channels</p>
          <nav className="space-y-0.5">
            {connectedChannels.map((channel) => (
              <FilterRow
                key={channel.id}
                icon={<ChannelDot type={channel.type} />}
                label={channel.externalAccountName || CHANNEL_LABEL[channel.type]}
                active={plain && sidebar.channelConnectionId === channel.id && Object.keys(sidebar).length === 1}
                onClick={() => go(() => selectInbox({ channelConnectionId: channel.id }))}
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
  title,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number | string;
  active: boolean;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active ? "bg-accent font-medium text-accent-foreground" : "text-foreground/80 hover:bg-accent/60",
      )}
    >
      {icon}
      <span className="flex-1 truncate text-left">{label}</span>
      {count !== undefined && count !== 0 && <span className="text-xs text-muted-foreground">{count}</span>}
    </button>
  );
}
