"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSendMessage, useRequestUploadUrl } from "@/hooks/use-messages";
import type { ChannelCapabilities, ConversationStatus, MessageType } from "@/lib/types";
import { Loader2, Paperclip, Send, X } from "lucide-react";

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
}: {
  conversationId: string;
  status: ConversationStatus;
  capabilities?: ChannelCapabilities;
}) {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendMessage = useSendMessage();
  const requestUploadUrl = useRequestUploadUrl();

  const canAttach =
    capabilities && (capabilities.sendImage || capabilities.sendVideo || capabilities.sendAudio || capabilities.sendDocument);
  const isResolved = status === "RESOLVED";
  const isSending = sendMessage.isPending || requestUploadUrl.isPending;

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
      <div className="flex items-end gap-2">
        {canAttach && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={(e) => setPendingFile(e.target.files?.[0] ?? null)}
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
          onChange={(e) => setText(e.target.value)}
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
