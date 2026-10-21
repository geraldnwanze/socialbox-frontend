"use client";

import { useInboxFilters } from "./inbox-filters-context";
import { SaveViewDialog } from "./save-view-dialog";
import { useTags } from "@/hooks/use-tags";
import { PRIORITIES, PRIORITY_LABEL } from "@/lib/priority";
import type { ConversationPriority } from "@/lib/types";
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
import { ArrowDownUp, Bookmark, Check, Flag, ListFilter, Tag as TagIcon, X } from "lucide-react";

/** Priority, tag and sort filters, plus "Save view" once the inbox is filtered. */
export function InboxFilterMenu() {
  const { extras, setExtras, isCustomised, snapshot, reset, applyView } = useInboxFilters();
  const { data: tags } = useTags();
  const active = [
    extras.priority && `${PRIORITY_LABEL[extras.priority]} priority`,
    extras.tagId && `Tag: ${tags?.find((t) => t.id === extras.tagId)?.name ?? "…"}`,
    extras.sort === "oldest" && "Oldest first",
  ].filter(Boolean) as string[];

  const mark = (on: boolean) => <Check className={on ? "h-3.5 w-3.5" : "h-3.5 w-3.5 opacity-0"} />;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-xs">
              <ListFilter className="h-3.5 w-3.5" />
              Filter
              {active.length > 0 && <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">{active.length}</span>}
            </Button>
          }
        />
        <DropdownMenuContent align="start" className="w-52">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <Flag className="h-3 w-3" /> Priority
            </DropdownMenuLabel>
            {PRIORITIES.map((p) => (
              <DropdownMenuItem
                key={p.value}
                onClick={() => setExtras({ ...extras, priority: extras.priority === p.value ? undefined : (p.value as ConversationPriority) })}
              >
                {mark(extras.priority === p.value)} {p.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
          {tags && tags.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex items-center gap-1.5">
                  <TagIcon className="h-3 w-3" /> Tag
                </DropdownMenuLabel>
                {tags.map((t) => (
                  <DropdownMenuItem key={t.id} onClick={() => setExtras({ ...extras, tagId: extras.tagId === t.id ? undefined : t.id })}>
                    {mark(extras.tagId === t.id)} {t.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-1.5">
              <ArrowDownUp className="h-3 w-3" /> Order
            </DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setExtras({ ...extras, sort: undefined })}>
              {mark(extras.sort !== "oldest")} Newest first
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setExtras({ ...extras, sort: "oldest" })}>
              {mark(extras.sort === "oldest")} Oldest first
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {isCustomised && (
        <>
          <SaveViewDialog
            filters={snapshot()}
            onSaved={applyView}
            trigger={
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
                <Bookmark className="h-3.5 w-3.5" /> Save view
              </Button>
            }
          />
          <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs text-muted-foreground" onClick={reset} aria-label="Clear filters">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        </>
      )}
    </div>
  );
}
