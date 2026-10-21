"use client";

import { format } from "date-fns";
import type { Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRetryMessage } from "@/hooks/use-messages";
import { Check, CheckCheck, Clock, RotateCw, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { AttachmentChip } from "@/components/inbox/attachment-chip";
import { FormattedEmail } from "@/components/inbox/formatted-email";

function StatusIcon({ message }: { message: Message }) {
  switch (message.status) {
    case "QUEUED":
    case "SENDING":
      return <Clock className="h-3 w-3" />;
    case "SENT":
      return <Check className="h-3 w-3" />;
    case "DELIVERED":
      return <CheckCheck className="h-3 w-3" />;
    case "READ":
      return <CheckCheck className="h-3 w-3 text-blue-400" />;
    case "FAILED":
      return <TriangleAlert className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
}

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "OUTBOUND";
  const retry = useRetryMessage();
  const [formatted, setFormatted] = useState(false);
  const html = typeof message.metadata?.html === "string" ? message.metadata.html : null;

  return (
    <div className={cn("flex", isOutbound ? "justify-end" : "justify-start")}>
      <div className="max-w-[70%] space-y-1">
        <div
          className={cn(
            "rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words",
            isOutbound
              ? "rounded-br-sm bg-primary text-primary-foreground"
              : "rounded-bl-sm bg-muted text-foreground",
          )}
        >
          {message.attachments && message.attachments.length > 0 && (
            <div className="mb-1.5 space-y-1">
              {message.attachments.map((attachment) => (
                <AttachmentChip key={attachment.id} attachment={attachment} outbound={isOutbound} />
              ))}
            </div>
          )}
          {typeof message.metadata?.subject === "string" && message.metadata.subject && (
            <p className="mb-1 font-semibold">{message.metadata.subject}</p>
          )}
          {formatted && html ? <FormattedEmail html={html} /> : message.content}
          {html && (
            <button
              type="button"
              onClick={() => setFormatted((f) => !f)}
              className="mt-1.5 block text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100"
            >
              {formatted ? "Show plain text" : "Show formatted"}
            </button>
          )}
        </div>
        <div
          className={cn(
            "flex items-center gap-1 text-[11px] text-muted-foreground",
            isOutbound ? "justify-end" : "justify-start",
          )}
        >
          <span>{format(new Date(message.sentAt), "p")}</span>
          {isOutbound && <StatusIcon message={message} />}
          {message.status === "FAILED" && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[11px] text-destructive"
              disabled={retry.isPending}
              onClick={() => retry.mutate({ messageId: message.id, conversationId: message.conversationId })}
            >
              <RotateCw className="h-3 w-3" /> Retry
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
