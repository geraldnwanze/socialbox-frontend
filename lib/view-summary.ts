import { CHANNEL_LABEL } from "./channel-meta";
import { PRIORITY_LABEL } from "./priority";
import type { ChannelConnection, InboxViewFilters, Tag, WorkspaceMember } from "./types";

const STATUS_LABEL = { OPEN: "Open", PENDING: "Pending", RESOLVED: "Resolved" } as const;

/** "Open · Urgent · Assigned to me · tag Refund" — what a view (or the current filters) amounts to. */
export function describeFilters(
  f: InboxViewFilters,
  ctx: { channels?: ChannelConnection[]; tags?: Tag[]; members?: WorkspaceMember[] },
): string {
  const parts: string[] = [STATUS_LABEL[f.status ?? "OPEN"]];
  if (f.unreadOnly) parts.push("Unread");
  if (f.assignedTo === "me") parts.push("Assigned to me");
  else if (f.assignedTo === "unassigned") parts.push("Unassigned");
  else if (f.assignedTo) parts.push(`Assigned to ${ctx.members?.find((m) => m.id === f.assignedTo)?.user.fullName ?? "a teammate"}`);
  if (f.priority) parts.push(`${PRIORITY_LABEL[f.priority]} priority`);
  if (f.channelConnectionId) {
    const c = ctx.channels?.find((x) => x.id === f.channelConnectionId);
    parts.push(c ? c.externalAccountName || CHANNEL_LABEL[c.type] : "One channel");
  }
  if (f.tagId) parts.push(`Tag: ${ctx.tags?.find((t) => t.id === f.tagId)?.name ?? "…"}`);
  if (f.search) parts.push(`"${f.search}"`);
  if (f.sort === "oldest") parts.push("Oldest first");
  return parts.join(" · ");
}
