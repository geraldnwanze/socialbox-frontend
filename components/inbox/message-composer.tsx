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
import type { CannedResponse, ChannelCapabilities, ConversationStatus, MessageType } from "@/lib/types";
import { Loader2, MessageSquareText, Paperclip, Send, X } from "lucide-react";

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
      {pendingFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-2 py-1 text-xs">
          <Paperclip className="h-3.5 w-3.5" />
          <span className="flex-1 truncate">{pendingFile.name}</span>
          <button onClick={() => setPendingFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
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
      <div className="flex items-end gap-2">
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
          className="min-h-10 flex-1 resize-none"
          rows={1}
          disabled={isSending}
        />
        <Button onClick={handleSend} disabled={isSending || (!text.trim() && !pendingFile)}>
          {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
