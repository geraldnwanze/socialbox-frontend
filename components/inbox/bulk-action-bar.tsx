"use client";

import { toast } from "sonner";
import { useBulkConversationAction } from "@/hooks/use-conversations";
import { useTags } from "@/hooks/use-tags";
import { useTeamMembers } from "@/hooks/use-team";
import { PRIORITIES } from "@/lib/priority";
import type { BulkAction, ConversationStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CircleCheck, Clock, Flag, Loader2, MailOpen, MoreHorizontal, RotateCcw, Tag as TagIcon, UserPlus, X } from "lucide-react";

const DONE: Record<BulkAction["type"], string> = {
  RESOLVE: "Resolved",
  REOPEN: "Reopened",
  PENDING: "Marked pending",
  MARK_READ: "Marked read",
  ASSIGN: "Updated assignee on",
  PRIORITY: "Updated priority on",
  ADD_TAG: "Tagged",
  REMOVE_TAG: "Removed tag from",
};

/** Appears while conversations are selected. One action applies to all of them. */
export function BulkActionBar({
  selectedIds,
  status,
  onDone,
  onClear,
}: {
  selectedIds: string[];
  status: ConversationStatus;
  onDone: (failedIds: string[]) => void;
  onClear: () => void;
}) {
  const bulk = useBulkConversationAction();
  const { data: members } = useTeamMembers();
  const { data: tags } = useTags();

  function run(action: BulkAction) {
    bulk.mutate(
      { ids: selectedIds, action },
      {
        onSuccess: (result) => {
          const noun = `conversation${result.updated === 1 ? "" : "s"}`;
          if (result.failed.length === 0) toast.success(`${DONE[action.type]} ${result.updated} ${noun}`);
          else toast.warning(`${DONE[action.type]} ${result.updated} ${noun}; ${result.failed.length} couldn't be updated`);
          onDone(result.failed.map((f) => f.id));
        },
        onError: () => toast.error("Something went wrong — nothing was changed. Try again."),
      },
    );
  }

  const busy = bulk.isPending;
  const icon = "h-4 w-4";

  return (
    <div className="flex items-center gap-1 border-b bg-accent/40 px-3 py-2" role="toolbar" aria-label="Bulk actions">
      <span className="mr-auto text-sm font-medium">{selectedIds.length} selected</span>
      {busy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      {status !== "RESOLVED" ? (
        <Button size="icon" variant="ghost" title="Resolve" aria-label="Resolve selected" disabled={busy} onClick={() => run({ type: "RESOLVE" })}>
          <CircleCheck className={icon} />
        </Button>
      ) : (
        <Button size="icon" variant="ghost" title="Reopen" aria-label="Reopen selected" disabled={busy} onClick={() => run({ type: "REOPEN" })}>
          <RotateCcw className={icon} />
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="ghost" title="Assign" aria-label="Assign selected" disabled={busy}><UserPlus className={icon} /></Button>} />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Assign to</DropdownMenuLabel>
            {members?.map((m) => (
              <DropdownMenuItem key={m.id} onClick={() => run({ type: "ASSIGN", memberId: m.id })}>
                {m.user.fullName}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => run({ type: "ASSIGN", memberId: null })}>Unassign</DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="ghost" title="Priority" aria-label="Set priority" disabled={busy}><Flag className={icon} /></Button>} />
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Set priority</DropdownMenuLabel>
            {PRIORITIES.map((p) => (
              <DropdownMenuItem key={p.value} onClick={() => run({ type: "PRIORITY", priority: p.value })}>
                {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {tags && tags.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button size="icon" variant="ghost" title="Tag" aria-label="Tag selected" disabled={busy}><TagIcon className={icon} /></Button>} />
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Add tag</DropdownMenuLabel>
              {tags.map((t) => (
                <DropdownMenuItem key={t.id} onClick={() => run({ type: "ADD_TAG", tagId: t.id })}>
                  {t.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Remove tag</DropdownMenuLabel>
              {tags.map((t) => (
                <DropdownMenuItem key={`rm-${t.id}`} onClick={() => run({ type: "REMOVE_TAG", tagId: t.id })}>
                  {t.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger render={<Button size="icon" variant="ghost" title="More" aria-label="More actions" disabled={busy}><MoreHorizontal className={icon} /></Button>} />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => run({ type: "MARK_READ" })}>
            <MailOpen className={icon} /> Mark as read
          </DropdownMenuItem>
          {status === "OPEN" && (
            <DropdownMenuItem onClick={() => run({ type: "PENDING" })}>
              <Clock className={icon} /> Mark as pending
            </DropdownMenuItem>
          )}
          {status === "PENDING" && (
            <DropdownMenuItem onClick={() => run({ type: "REOPEN" })}>
              <RotateCcw className={icon} /> Move back to open
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="icon" variant="ghost" title="Clear selection" aria-label="Clear selection" onClick={onClear}>
        <X className={icon} />
      </Button>
    </div>
  );
}
