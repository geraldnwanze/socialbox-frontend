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

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Sending",
  SENDING: "Sending",
  SENT: "Sent",
  DELIVERED: "Delivered",
  READ: "Read by the customer",
  FAILED: "Not delivered",
};

function StatusIcon({ message }: { message: Message }) {
  const label = STATUS_LABEL[message.status];
  const icon = (() => {
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
  })();
  if (!icon) return null;
  return (
    <span title={label} aria-label={label} className="inline-flex items-center gap-1">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function MessageBubble({ message }: { message: Message }) {
  const isOutbound = message.direction === "OUTBOUND";
  const retry = useRetryMessage();
  const [formatted, setFormatted] = useState(false);
  const html = typeof message.metadata?.html === "string" ? message.metadata.html : null;
  const automated = message.senderType === "SYSTEM" && isOutbound;

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
          {automated && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">Automated reply</p>}
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
        {message.status === "FAILED" && message.failureReason && (
          <p className={cn("text-[11px] text-destructive", isOutbound ? "text-right" : "text-left")}>
            {message.failureReason}
          </p>
        )}
      </div>
    </div>
  );
}
