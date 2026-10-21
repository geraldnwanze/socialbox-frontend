"use client";

import { useState } from "react";
import { useWorkspace } from "@/providers/workspace-provider";
import { useAnalyticsOverview } from "@/hooks/use-analytics";
import { formatDuration } from "@/lib/format-duration";
import { ChannelLabel } from "@/components/channel-badge";
import { PageSpinner } from "@/components/page-spinner";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function AnalyticsPage() {
  const { activeWorkspace } = useWorkspace();
  const isAdmin = activeWorkspace?.role === "OWNER" || activeWorkspace?.role === "ADMIN";
  const [days, setDays] = useState<(typeof RANGES)[number]>(7);
  const { data, isLoading, isError } = useAnalyticsOverview(days, isAdmin);

  if (!activeWorkspace) return <PageSpinner />;
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">
        Analytics are available to workspace admins and owners.
      </div>
    );
  }

  const maxDaily = Math.max(1, ...(data?.daily.map((d) => d.conversations) ?? [1]));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-4xl space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Conversations that started in the last {days} days. Times are wall-clock (UTC days), not business hours.
            </p>
          </div>
          <div role="group" aria-label="Date range" className="inline-flex rounded-md border p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={days === r}
                onClick={() => setDays(r)}
                className={cn(
                  "rounded px-3 py-1 text-sm",
                  days === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {isLoading && <PageSpinner />}
        {isError && <p className="text-sm text-destructive">Unable to load analytics. Try again.</p>}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="New conversations" value={data.totals.newConversations} />
              <Stat
                label="Median first response"
                value={formatDuration(data.firstResponse.medianSeconds)}
                hint={`Average ${formatDuration(data.firstResponse.avgSeconds)} · 90% within ${formatDuration(data.firstResponse.p90Seconds)}`}
              />
              <Stat
                label="Awaiting first reply"
                value={data.totals.unanswered}
                hint={`${data.totals.answered} answered`}
              />
              <Stat
                label="Median resolution"
                value={formatDuration(data.resolution.medianSeconds)}
                hint={`${data.totals.resolved} resolved`}
              />
            </div>
            <p className="-mt-3 text-xs text-muted-foreground">
              Messages: {data.totals.inboundMessages} received, {data.totals.outboundMessages} sent. Resolution times for
              conversations resolved before this feature shipped are approximate.
            </p>

            <section className="space-y-2">
              <h2 className="font-medium">New conversations per day</h2>
              <div className="flex h-32 items-end gap-1 rounded-lg border p-3" role="img" aria-label="Conversations per day">
                {data.daily.map((d) => (
                  <div key={d.date} className="group relative flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-primary/80 group-hover:bg-primary"
                      style={{ height: `${(d.conversations / maxDaily) * 100}%`, minHeight: d.conversations ? 2 : 0 }}
                      title={`${d.date}: ${d.conversations}`}
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{data.daily[0]?.date}</span>
                <span>{data.daily[data.daily.length - 1]?.date}</span>
              </div>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium">By channel</h2>
              {data.byChannel.length === 0 ? (
                <p className="text-sm text-muted-foreground">No conversations in this period.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {data.byChannel.map((c) => (
                    <div key={c.channelConnectionId} className="flex items-center gap-3 p-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <ChannelLabel type={c.type} />
                        {c.name && <p className="truncate text-xs text-muted-foreground">{c.name}</p>}
                      </div>
                      <span className="w-28 text-right tabular-nums">{c.conversations} {c.conversations === 1 ? "conversation" : "conversations"}</span>
                      <span className="w-24 text-right tabular-nums text-muted-foreground">
                        {formatDuration(c.medianFirstResponseSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="font-medium">By agent</h2>
              <p className="text-xs text-muted-foreground">
                Credited to whoever sent the first reply in each conversation.
              </p>
              {data.byAgent.length === 0 ? (
                <p className="text-sm text-muted-foreground">No replies in this period.</p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {data.byAgent.map((a) => (
                    <div key={a.memberId} className="flex items-center gap-3 p-3 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium">{a.name ?? "Former member"}</span>
                      <span className="w-28 text-right tabular-nums">{a.firstReplies} first {a.firstReplies === 1 ? "reply" : "replies"}</span>
                      <span className="w-24 text-right tabular-nums text-muted-foreground">
                        {formatDuration(a.medianFirstResponseSeconds)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
