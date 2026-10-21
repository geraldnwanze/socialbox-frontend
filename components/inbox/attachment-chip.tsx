"use client";

import { useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { MessageAttachment } from "@/lib/types";
import { cn } from "@/lib/utils";
import { FileText, Loader2 } from "lucide-react";

function formatSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Files we hold are fetched through a short-lived signed link on click (so nothing is public and
 *  the link never goes stale in the page); not-yet-mirrored provider media falls back to its source. */
export function AttachmentChip({ attachment, outbound }: { attachment: MessageAttachment; outbound: boolean }) {
  const [loading, setLoading] = useState(false);
  const label = attachment.fileName ?? "Attachment";
  const size = formatSize(attachment.fileSize);

  async function open() {
    if (!attachment.storageKey) {
      if (attachment.sourceUrl) window.open(attachment.sourceUrl, "_blank", "noopener,noreferrer");
      else toast.error("This file isn't available yet — try again in a moment");
      return;
    }
    setLoading(true);
    try {
      const { url } = await api.get<{ url: string }>(`/attachments/${attachment.id}/download-url`);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Unable to open this file");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={open}
      disabled={loading}
      className={cn(
        "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs underline-offset-2 hover:underline",
        outbound ? "bg-primary-foreground/10" : "bg-background/60",
      )}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" /> : <FileText className="h-3.5 w-3.5 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {size && <span className="shrink-0 opacity-70">{size}</span>}
    </button>
  );
}
