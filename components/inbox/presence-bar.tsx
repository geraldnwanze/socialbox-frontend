"use client";

import { useOtherViewers } from "@/hooks/use-presence";
import { cn } from "@/lib/utils";
import { Eye, PencilLine } from "lucide-react";

function list(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** Warns when a teammate is typing a reply (so you don't answer twice) or just has the conversation open. */
export function PresenceBar({ conversationId }: { conversationId: string }) {
  const viewers = useOtherViewers(conversationId);
  if (viewers.length === 0) return null;

  const typers = viewers.filter((v) => v.typing);
  const typing = typers.length > 0;
  const names = list((typing ? typers : viewers).map((v) => v.name));
  const plural = (typing ? typers : viewers).length > 1;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 border-t px-4 py-1.5 text-xs",
        typing ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : "bg-muted/40 text-muted-foreground",
      )}
    >
      {typing ? <PencilLine className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      {typing
        ? `${names} ${plural ? "are" : "is"} typing a reply — check before you send yours`
        : `${names} ${plural ? "are" : "is"} also viewing this conversation`}
    </div>
  );
}

/** Small initials next to a conversation in the list: who else has it open right now. */
export function ViewerBadges({ conversationId }: { conversationId: string }) {
  const viewers = useOtherViewers(conversationId);
  if (viewers.length === 0) return null;
  return (
    <div className="flex -space-x-1" title={viewers.map((v) => `${v.name}${v.typing ? " (typing)" : ""}`).join(", ")}>
      {viewers.slice(0, 3).map((v) => (
        <span
          key={v.userId}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-full border border-background bg-secondary text-[9px] font-medium",
            v.typing && "animate-pulse bg-amber-200 text-amber-900",
          )}
        >
          {v.name
            .split(" ")
            .map((p) => p[0])
            .slice(0, 2)
            .join("")
            .toUpperCase()}
        </span>
      ))}
    </div>
  );
}
