"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendMessage, useRequestUploadUrl } from "@/hooks/use-messages";
import { api } from "@/lib/api-client";
import { useCannedResponses } from "@/hooks/use-canned-responses";
import { useAuth } from "@/providers/auth-provider";
import { expandCannedResponse } from "@/lib/canned-response-template";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-client";
import { useAiAvailable, useRewrite, useSuggestReply } from "@/hooks/use-ai";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { RewriteTone } from "@/lib/types";
import type { CannedResponse, ChannelCapabilities, ConversationStatus, MessageType } from "@/lib/types";
import { Loader2, MessageSquareText, Paperclip, Send, Sparkles, X } from "lucide-react";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function messageTypeForMime(mimeType: string): MessageType {
  if (mimeType.startsWith("image/")) return "IMAGE";
  if (mimeType.startsWith("video/")) return "VIDEO";
  if (mimeType.startsWith("audio/")) return "AUDIO";
  return "DOCUMENT";
}

export function MessageComposer({
  conversationId,
  status,
  capabilities,
  customerName,
}: {
  conversationId: string;
  customerName?: string | null;
  status: ConversationStatus;
  capabilities?: ChannelCapabilities;
}) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { user } = useAuth();
  const { data: replies } = useCannedResponses();
  const [activeIndex, setActiveIndex] = useState(0);
  const [pickerDismissed, setPickerDismissed] = useState(false);
  const [browsing, setBrowsing] = useState(false);
  const aiAvailable = useAiAvailable();
  const suggestReply = useSuggestReply();
  const rewrite = useRewrite();
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [undoText, setUndoText] = useState<string | null>(null);
  const aiBusy = suggestReply.isPending || rewrite.isPending;
  const sendMessage = useSendMessage();
  const requestUploadUrl = useRequestUploadUrl();

  const canAttach =
    capabilities && (capabilities.sendImage || capabilities.sendVideo || capabilities.sendAudio || capabilities.sendDocument);
  const isResolved = status === "RESOLVED";
  const isSending = sendMessage.isPending || requestUploadUrl.isPending;

  // The picker opens while the whole draft is a single "/word" (or via the button, which lists everything).
  const slashQuery = /^\/([\w-]*)$/.exec(text)?.[1];
  const query = browsing ? "" : slashQuery;
  const pickerOpen = !pickerDismissed && (browsing || slashQuery !== undefined);
  const matches = useMemo(() => {
    if (query === undefined) return [];
    const q = query.toLowerCase();
    return (replies ?? []).filter(
      (r) => r.shortcut.includes(q) || r.title.toLowerCase().includes(q),
    );
  }, [replies, query]);
  const showPicker = pickerOpen && (replies?.length ?? 0) > 0;

  function insertReply(reply: CannedResponse) {
    setText(expandCannedResponse(reply.content, { customerName, agentName: user?.fullName }));
    setBrowsing(false);
    setPickerDismissed(false);
    setActiveIndex(0);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  // Lets the customer's side show "typing…" (live chat). At most one request per 3 seconds.
  const lastTypingPing = useRef(0);
  function pingTyping(value: string) {
    const now = Date.now();
    if (!value.trim() || value.startsWith("/") || now - lastTypingPing.current < 3000) return;
    lastTypingPing.current = now;
    api.post(`/conversations/${conversationId}/presence`, { typing: true }).catch(() => undefined);
  }

  const aiError = (err: unknown) => toast.error(err instanceof ApiError ? err.message : "AI assist couldn't do that — try again");

  function askForSuggestion() {
    // Anything the agent already typed acts as guidance ("offer a refund"), not as the draft itself.
    const steer = text.trim().slice(0, 300);
    suggestReply.mutate(
      { conversationId, instruction: steer || undefined },
      { onSuccess: (res) => setSuggestion(res.text), onError: aiError },
    );
  }

  function applySuggestion() {
    if (suggestion === null) return;
    setUndoText(text);
    setText(suggestion);
    setSuggestion(null);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  function rewriteDraft(tone: RewriteTone) {
    if (!text.trim()) return;
    rewrite.mutate(
      { text, tone },
      {
        onSuccess: (res) => {
          setUndoText(text);
          setText(res.text);
        },
        onError: aiError,
      },
    );
  }

  async function handleSend() {
    if (isResolved) return;
    if (!text.trim() && !pendingFile) return;

    try {
      if (pendingFile) {
        const { storageKey, uploadUrl } = await requestUploadUrl.mutateAsync({
          fileName: pendingFile.name,
          mimeType: pendingFile.type || "application/octet-stream",
        });
        await fetch(uploadUrl, { method: "PUT", body: pendingFile, headers: { "content-type": pendingFile.type } });
        await sendMessage.mutateAsync({
          conversationId,
          type: messageTypeForMime(pendingFile.type),
          text: text.trim() || undefined,
          attachment: { storageKey, mimeType: pendingFile.type, fileName: pendingFile.name },
        });
        setPendingFile(null);
      } else {
        await sendMessage.mutateAsync({ conversationId, type: "TEXT", text: text.trim() });
      }
      setText("");
      setUndoText(null);
      setSuggestion(null);
    } catch {
      toast.error("Unable to send message — please try again");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (showPicker) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (matches.length === 0) return;
        const step = e.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((i) => (i + step + matches.length) % matches.length);
        return;
      }
      if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
        // Never send a half-typed "/ship" to the customer: Enter picks while the picker is open.
        e.preventDefault();
        const choice = matches[Math.min(activeIndex, matches.length - 1)];
        if (choice) insertReply(choice);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPickerDismissed(true);
        setBrowsing(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (isResolved) {
    return (
      <div className="border-t p-4 text-center text-sm text-muted-foreground">
        This conversation is resolved. Reopen it to send a new message.
      </div>
    );
  }

  return (
    <div className="space-y-2 border-t p-3">
      {undoText !== null && (
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          onClick={() => {
            setText(undoText);
            setUndoText(null);
          }}
        >
          Undo AI change
        </button>
      )}
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs">
          <Paperclip className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {suggestion !== null && (
        <div className="space-y-2 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm dark:border-violet-900 dark:bg-violet-950/30">
          <p className="flex items-center gap-1 text-xs font-medium text-violet-900 dark:text-violet-200">
            <Sparkles className="h-3 w-3" /> Suggested reply — check it before you send
          </p>
          <p className="whitespace-pre-wrap">{suggestion}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={applySuggestion}>
              Use this reply
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={aiBusy} onClick={askForSuggestion}>
              {suggestReply.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Try again
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSuggestion(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      {showPicker && (
        <div role="listbox" aria-label="Saved replies" className="max-h-60 overflow-y-auto rounded-md border bg-popover p-1 shadow-md">
          {matches.length === 0 && <p className="px-2 py-1.5 text-sm text-muted-foreground">No matching replies</p>}
          {matches.map((reply, i) => (
            <button
              key={reply.id}
              type="button"
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                insertReply(reply);
              }}
              className={cn("block w-full rounded px-2 py-1.5 text-left", i === activeIndex && "bg-accent")}
            >
              <span className="flex items-center gap-2 text-sm">
                <span className="font-medium">{reply.title}</span>
                <code className="text-xs text-muted-foreground">/{reply.shortcut}</code>
              </span>
              <span className="line-clamp-1 text-xs text-muted-foreground">{reply.content}</span>
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-2">
        <Textarea
          value={text}
          ref={textareaRef}
          onChange={(e) => {
            setText(e.target.value);
            pingTyping(e.target.value);
            setPickerDismissed(false);
            setBrowsing(false);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-20 w-full resize-none"
          rows={3}
          disabled={isSending}
        />
        <div className="flex items-center gap-1">
        {aiAvailable && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button type="button" variant="ghost" size="icon" title="AI assist" aria-label="AI assist" disabled={isSending || aiBusy}>
                  {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                </Button>
              }
            />
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={askForSuggestion}>
                  <Sparkles className="h-4 w-4" /> Suggest a reply
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Rewrite my draft</DropdownMenuLabel>
                {(
                  [
                    ["friendlier", "Friendlier"],
                    ["more_formal", "More formal"],
                    ["shorter", "Shorter"],
                    ["fix_grammar", "Fix spelling & grammar"],
                  ] as [RewriteTone, string][]
                ).map(([tone, label]) => (
                  <DropdownMenuItem key={tone} disabled={!text.trim()} onClick={() => rewriteDraft(tone)}>
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          title="Saved replies"
          aria-label="Saved replies"
          onClick={() => {
            setPickerDismissed(false);
            setActiveIndex(0);
            setBrowsing((b) => !b);
            textareaRef.current?.focus();
          }}
          disabled={isSending}
        >
          <MessageSquareText className="h-4 w-4" />
        </Button>
        {canAttach && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                e.target.value = "";
                if (file && file.size > MAX_UPLOAD_BYTES) {
                  toast.error("Files can be at most 10 MB");
                  return;
                }
                setPendingFile(file);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSending}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </>
        )}
          <div className="flex-1" />
        <Button onClick={handleSend} disabled={isSending || (!text.trim() && !pendingFile)}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
        </div>
      </div>
    </div>
  );
}
