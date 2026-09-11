"use client";

import { useState } from "react";
import type { Conversation } from "@/lib/types";
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
import { useTeamMembers } from "@/hooks/use-team";
import { useTags } from "@/hooks/use-tags";
import { useConversationTags } from "@/hooks/use-conversation-tags";
import {
  useAddConversationTag,
  useAssignConversation,
  useRemoveConversationTag,
  useReopenConversation,
  useResolveConversation,
} from "@/hooks/use-conversations";
import { CircleCheck, Loader2, RotateCcw, Tag as TagIcon } from "lucide-react";

function initialsOf(name?: string) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export function CustomerPanel({ conversation }: { conversation: Conversation }) {
  const { data: members } = useTeamMembers();
  const { data: allTags } = useTags();
  const { data: conversationTags } = useConversationTags(conversation.id);
  const assign = useAssignConversation();
  const resolve = useResolveConversation();
  const reopen = useReopenConversation();
  const addTag = useAddConversationTag();
  const removeTag = useRemoveConversationTag();
  const [isMutating, setIsMutating] = useState(false);

  const contact = conversation.contact;
  const appliedTagIds = new Set((conversationTags ?? []).map((t) => t.tagId));

  async function handleResolveToggle() {
    setIsMutating(true);
    try {
      if (conversation.status === "RESOLVED") await reopen.mutateAsync(conversation.id);
      else await resolve.mutateAsync(conversation.id);
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <aside className="flex w-72 shrink-0 flex-col gap-5 overflow-y-auto border-l p-4">
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

      <Button
        variant={conversation.status === "RESOLVED" ? "outline" : "default"}
        onClick={handleResolveToggle}
        disabled={isMutating}
      >
        {isMutating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : conversation.status === "RESOLVED" ? (
          <RotateCcw className="h-4 w-4" />
        ) : (
          <CircleCheck className="h-4 w-4" />
        )}
        {conversation.status === "RESOLVED" ? "Reopen conversation" : "Resolve conversation"}
      </Button>

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
            <SelectValue placeholder="Unassigned" />
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
          {contact?.identities?.map((identity) => (
            <div key={identity.id} className="flex items-center justify-between text-sm">
              <ChannelLabel type={identity.channel} />
              <span className="truncate text-muted-foreground">
                {identity.username ? `@${identity.username}` : identity.externalUserId}
              </span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
