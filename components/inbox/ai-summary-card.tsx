"use client";

import { toast } from "sonner";
import { useAiAvailable, useAiSummary } from "@/hooks/use-ai";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";

const SENTIMENT = {
  POSITIVE: { label: "Positive", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  NEUTRAL: { label: "Neutral", className: "bg-muted text-muted-foreground" },
  NEGATIVE: { label: "Negative", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
} as const;

/** On-demand AI summary of the open conversation. Hidden unless AI assist is available and switched on. */
export function AiSummaryCard({ conversationId }: { conversationId: string }) {
  const available = useAiAvailable();
  const summary = useAiSummary();
  if (!available) return null;

  const data = summary.data;
  const run = () =>
    summary.mutate(conversationId, {
      onError: (err) => toast.error(err instanceof ApiError ? err.message : "AI assist couldn't do that — try again"),
    });

  return (
    <>
    <Separator />
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1 text-xs font-medium uppercase text-muted-foreground">
          <Sparkles className="h-3 w-3" /> AI summary
        </p>
        {data && (
          <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Summarize again" disabled={summary.isPending} onClick={run}>
            <RefreshCw className={cn("h-3.5 w-3.5", summary.isPending && "animate-spin")} />
          </Button>
        )}
      </div>

      {!data && (
        <Button variant="outline" size="sm" className="w-full" disabled={summary.isPending} onClick={run}>
          {summary.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Summarize this conversation
        </Button>
      )}

      {data && (
        <div className="space-y-2 rounded-md border bg-muted/30 p-2.5 text-sm">
          <p>{data.summary}</p>
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className={cn("rounded px-1.5 py-0.5 font-medium", SENTIMENT[data.sentiment].className)}>
              {SENTIMENT[data.sentiment].label}
            </span>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-medium">{data.intent}</span>
            {data.needsReply && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
                Needs a reply
              </span>
            )}
          </div>
          {data.nextStep && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/80">Suggested next step:</span> {data.nextStep}
            </p>
          )}
          <p className="text-[10px] text-muted-foreground">AI-generated — check it before relying on it.</p>
        </div>
      )}
    </div>
    </>
  );
}
