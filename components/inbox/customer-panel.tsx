"use client";

import { useState } from "react";
import type { Conversation, ConversationPriority } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelLabel } from "@/components/channel-badge";
import { ActivityTimeline } from "@/components/inbox/activity-timeline";
import { AiSummaryCard } from "@/components/inbox/ai-summary-card";
import { cn } from "@/lib/utils";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/priority";
import { identityLabel } from "@/lib/channel-meta";
import { useTeamMembers } from "@/hooks/use-team";
import { useTags } from "@/hooks/use-tags";
import { useConversationTags } from "@/hooks/use-conversation-tags";
import {
  useAddConversationTag,
  useAssignConversation,
  useRemoveConversationTag,
  useMarkConversationPending,
  useReopenConversation,
  useResolveConversation,
  useSetConversationPriority,
} from "@/hooks/use-conversations";
import { CircleCheck, Clock, Loader2, RotateCcw, Tag as TagIcon } from "lucide-react";

function initialsOf(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CustomerPanel({ conversation, className }: { conversation: Conversation; className?: string }) {
  const { data: members } = useTeamMembers();
  const { data: allTags } = useTags();
  const { data: conversationTags } = useConversationTags(conversation.id);
  const assign = useAssignConversation();
  const resolve = useResolveConversation();
  const reopen = useReopenConversation();
  const markPending = useMarkConversationPending();
  const setPriority = useSetConversationPriority();
  const addTag = useAddConversationTag();
  const removeTag = useRemoveConversationTag();
  const [isMutating, setIsMutating] = useState(false);

  const contact = conversation.contact;
  const appliedTagIds = new Set((conversationTags ?? []).map((t) => t.tagId));

  async function runStatusChange(change: () => Promise<unknown>) {
    setIsMutating(true);
    try {
      await change();
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <aside className={cn("flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l p-4", className)}>
      <div className="flex flex-col items-center gap-2 text-center">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="text-lg">{initialsOf(contact?.displayName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{contact?.displayName ?? "Unknown"}</p>
          <Badge variant={conversation.status === "RESOLVED" ? "secondary" : "outline"} className="mt-1">
            {conversation.status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {conversation.status === "RESOLVED" ? (
          <Button
            variant="outline"
            disabled={isMutating}
            onClick={() => runStatusChange(() => reopen.mutateAsync(conversation.id))}
          >
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Reopen conversation
          </Button>
        ) : (
          <>
            <Button
              disabled={isMutating}
              onClick={() => runStatusChange(() => resolve.mutateAsync(conversation.id))}
            >
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <CircleCheck className="h-4 w-4" />}
              Resolve conversation
            </Button>
            {conversation.status === "PENDING" ? (
              <Button
                variant="outline"
                disabled={isMutating}
                onClick={() => runStatusChange(() => reopen.mutateAsync(conversation.id))}
              >
                <RotateCcw className="h-4 w-4" />
                Move back to open
              </Button>
            ) : (
              <Button
                variant="outline"
                disabled={isMutating}
                onClick={() => runStatusChange(() => markPending.mutateAsync(conversation.id))}
              >
                <Clock className="h-4 w-4" />
                Mark as pending
              </Button>
            )}
          </>
        )}
      </div>

      <AiSummaryCard key={conversation.id} conversationId={conversation.id} />

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Priority</p>
        <Select
          value={conversation.priority ?? "NORMAL"}
          onValueChange={(value) =>
            setPriority.mutate({ id: conversation.id, priority: value as ConversationPriority })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue>{(value: string | null) => PRIORITY_LABEL[(value ?? "NORMAL") as ConversationPriority]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Assigned to</p>
        <Select
          value={conversation.assignedTo ?? "unassigned"}
          onValueChange={(value) =>
            assign.mutate({ id: conversation.id, assigneeMemberId: value === "unassigned" ? null : value })
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unassigned">
              {(value: string | null) =>
                members?.find((m) => m.id === value)?.user.fullName ?? "Unassigned"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {members?.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.user.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase text-muted-foreground">Tags</p>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <TagIcon className="h-3.5 w-3.5" />
                </Button>
              }
            />
            <DropdownMenuContent align="end">
              {allTags?.map((tag) => (
                <DropdownMenuCheckboxItem
                  key={tag.id}
                  checked={appliedTagIds.has(tag.id)}
                  onCheckedChange={(checked) =>
                    checked
                      ? addTag.mutate({ conversationId: conversation.id, tagId: tag.id })
                      : removeTag.mutate({ conversationId: conversation.id, tagId: tag.id })
                  }
                >
                  {tag.name}
                </DropdownMenuCheckboxItem>
              ))}
              {!allTags?.length && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No tags yet — create one in Settings.
                </p>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {conversationTags?.map((link) => (
            <Badge key={link.id} style={{ backgroundColor: link.tag.color, color: "white" }}>
              {link.tag.name}
            </Badge>
          ))}
          {!conversationTags?.length && <p className="text-sm text-muted-foreground">No tags applied.</p>}
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase text-muted-foreground">Channels</p>
        <div className="space-y-2">
          {contact?.identities?.map((identity) =>
            identity.channel === "LIVE_CHAT" ? (
              <div key={identity.id} className="space-y-2">
                <ChannelLabel type={identity.channel} />
                <VisitorDetails metadata={identity.metadata} />
              </div>
            ) : (
              <div key={identity.id} className="flex items-center justify-between text-sm">
                <ChannelLabel type={identity.channel} />
                <span className="truncate text-muted-foreground">
                  {identityLabel(identity)}
                </span>
              </div>
            ),
          )}
        </div>
      </div>

      <Separator />

      <ActivityTimeline conversationId={conversation.id} />
    </aside>
  );
}

function countryDisplay(code: string): string {
  const flag = String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
  let name = code.toUpperCase();
  try {
    name = new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? name;
  } catch {
    // Unknown region code: fall back to showing the code itself.
  }
  return `${flag} ${name}`;
}

/** Where the live-chat visitor is coming from. Page URL is supplied by the visitor's browser, so it
 *  is shown as text and only linked when it's a plain http(s) address. */
function VisitorDetails({ metadata }: { metadata?: Record<string, unknown> }) {
  const ip = typeof metadata?.ip === "string" ? metadata.ip : null;
  const countryCode = typeof metadata?.countryCode === "string" ? metadata.countryCode : null;
  const pageUrl = typeof metadata?.pageUrl === "string" ? metadata.pageUrl : null;

  if (!ip && !countryCode && !pageUrl) {
    return <p className="text-xs text-muted-foreground">No visitor details captured yet.</p>;
  }

  let pageLabel = pageUrl;
  let pageHref: string | null = null;
  if (pageUrl) {
    try {
      const url = new URL(pageUrl);
      if (url.protocol === "http:" || url.protocol === "https:") {
        pageHref = url.toString();
        pageLabel = `${url.host}${url.pathname === "/" ? "" : url.pathname}`;
      }
    } catch {
      pageHref = null;
    }
  }

  return (
    <dl className="space-y-1.5 text-sm">
      <VisitorRow label="Country" value={countryCode ? countryDisplay(countryCode) : "Unknown"} />
      <VisitorRow label="IP address" value={ip ?? "Unknown"} mono />
      <div className="flex items-start justify-between gap-3">
        <dt className="shrink-0 text-muted-foreground">Page</dt>
        <dd className="min-w-0 truncate text-right" title={pageUrl ?? undefined}>
          {pageHref ? (
            <a href={pageHref} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              {pageLabel}
            </a>
          ) : (
            (pageLabel ?? "Unknown")
          )}
        </dd>
      </div>
      {countryCode && (
        <p className="pt-1 text-[11px] text-muted-foreground">
          IP geolocation by{" "}
          <a href="https://db-ip.com" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            DB-IP
          </a>
        </p>
      )}
    </dl>
  );
}

function VisitorRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs" : undefined}>{value}</dd>
    </div>
  );
}
