"use client";

import { useState, type FormEvent } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { toast } from "sonner";
import { useAddConversationNote, useConversationEvents } from "@/hooks/use-conversations";
import { PRIORITY_LABEL } from "@/lib/priority";
import type { ConversationEvent, ConversationPriority } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, StickyNote } from "lucide-react";

const STATUS_VERB: Record<string, string> = {
  RESOLVED: "resolved this",
  OPEN: "reopened this",
  PENDING: "marked this as pending",
};

function describe(event: ConversationEvent): string {
  const who = event.actor?.name ?? "The customer";
  const d = event.data;
  switch (event.type) {
    case "CREATED":
      return "Conversation started";
    case "ASSIGNED":
      return event.actor && d.toName === event.actor.name
        ? `${who} took this conversation`
        : `${who} assigned this to ${String(d.toName ?? "a teammate")}`;
    case "UNASSIGNED":
      return `${who} unassigned this`;
    case "STATUS_CHANGED":
      return d.auto
        ? "The customer replied, so it was reopened"
        : `${who} ${STATUS_VERB[String(d.to)] ?? "changed the status"}`;
    case "PRIORITY_CHANGED":
      return `${who} set the priority to ${PRIORITY_LABEL[d.to as ConversationPriority] ?? String(d.to)}`;
    case "TAG_ADDED":
      return `${who} added the tag "${String(d.tagName ?? "")}"`;
    case "TAG_REMOVED":
      return `${who} removed the tag "${String(d.tagName ?? "")}"`;
    default:
      return "";
  }
}

export function ActivityTimeline({ conversationId }: { conversationId: string }) {
  const { data: events, isLoading } = useConversationEvents(conversationId);
  const addNote = useAddConversationNote();
  const [note, setNote] = useState("");

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    try {
      await addNote.mutateAsync({ id: conversationId, text });
      setNote("");
    } catch {
      toast.error("Unable to save the note");
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium uppercase text-muted-foreground">Activity</p>

      <form onSubmit={handleAddNote} className="space-y-1.5">
        <Textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          maxLength={2000}
          placeholder="Add an internal note (only your team sees this)"
          aria-label="Internal note"
          className="text-sm"
        />
        <Button type="submit" size="sm" variant="outline" disabled={!note.trim() || addNote.isPending}>
          {addNote.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <StickyNote className="h-3.5 w-3.5" />}
          Add note
        </Button>
      </form>

      {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}

      <ol className="space-y-2.5 border-l pl-3">
        {/* Newest first: what just happened matters most. */}
        {[...(events ?? [])].reverse().map((event) => (
          <li key={event.id} className="relative text-xs">
            <span className="absolute -left-[17px] top-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
            {event.type === "NOTE" ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <p className="whitespace-pre-wrap break-words">{String(event.data.text ?? "")}</p>
                <p className="mt-1 text-[11px] opacity-70">
                  {event.actor?.name ?? "Someone"} ·{" "}
                  <time title={format(new Date(event.createdAt), "PPpp")}>
                    {formatDistanceToNowStrict(new Date(event.createdAt), { addSuffix: true })}
                  </time>
                </p>
              </div>
            ) : (
              <>
                <p>{describe(event)}</p>
                <time className="text-[11px] text-muted-foreground" title={format(new Date(event.createdAt), "PPpp")}>
                  {formatDistanceToNowStrict(new Date(event.createdAt), { addSuffix: true })}
                </time>
              </>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
