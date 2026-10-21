"use client";

import { useState } from "react";
import { useWorkspace } from "@/providers/workspace-provider";
import { useAnalyticsOverview } from "@/hooks/use-analytics";
import { formatDuration } from "@/lib/format-duration";
import { ChannelLabel } from "@/components/channel-badge";
import { PageSpinner } from "@/components/page-spinner";
import { cn } from "@/lib/utils";
import { formatDistanceToNowStrict } from "date-fns";
import type { WorkloadRow } from "@/lib/types";

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
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-medium">Team workload</h2>
                <p className="text-xs text-muted-foreground">
                  {data.workload.backlog.awaitingReply === 0
                    ? "Nothing is waiting on a reply right now."
                    : `${data.workload.backlog.awaitingReply} waiting on a reply${
                        data.workload.backlog.oldestWaitingSince
                          ? `, the longest for ${formatDistanceToNowStrict(new Date(data.workload.backlog.oldestWaitingSince))}`
                          : ""
                      }`}
                </p>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Teammate</th>
                      <th className="px-2 py-2 text-right font-medium" title="Open conversations they own">Open</th>
                      <th className="px-2 py-2 text-right font-medium">Pending</th>
                      <th className="px-2 py-2 text-right font-medium" title="Open and the customer wrote last">Awaiting reply</th>
                      <th className="px-2 py-2 text-right font-medium" title="Longest wait for a reply">Oldest wait</th>
                      <th className="px-2 py-2 text-right font-medium" title="High or urgent priority, not resolved">High+</th>
                      <th className="px-2 py-2 text-right font-medium" title="In the selected period">Resolved</th>
                      <th className="px-2 py-2 text-right font-medium" title="In the selected period">Replies</th>
                      <th className="px-3 py-2 text-right font-medium" title="Median, in the selected period">First response</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {[data.workload.unassigned, ...data.workload.members].map((row: WorkloadRow) => (
                      <tr key={row.memberId ?? "unassigned"} className={row.memberId === null ? "bg-muted/20" : undefined}>
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.open}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.pending}</td>
                        <td className={cn("px-2 py-2 text-right tabular-nums", row.awaitingReply > 0 && "font-semibold text-amber-700 dark:text-amber-400")}>
                          {row.awaitingReply}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums text-muted-foreground">
                          {row.oldestWaitingSince ? formatDistanceToNowStrict(new Date(row.oldestWaitingSince)) : "—"}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.highPriority}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.resolved}</td>
                        <td className="px-2 py-2 text-right tabular-nums">{row.messagesSent}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                          {row.memberId === null ? "" : formatDuration(row.medianFirstResponseSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Open, pending and awaiting reply are right now; resolved, replies and first response cover the period
                above. &quot;Resolved&quot; counts conversations that person resolved themselves.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="font-medium">By tag</h2>
              {data.byTag.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tagged conversations in this period{data.untagged > 0 ? ` (${data.untagged} without a tag)` : ""}.
                </p>
              ) : (
                <div className="divide-y rounded-lg border">
                  {data.byTag.map((t) => (
                    <div key={t.tagId} className="flex items-center gap-3 p-3 text-sm">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: t.color }} />
                      <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
                      <span className="w-32 text-right tabular-nums">
                        {t.conversations} {t.conversations === 1 ? "conversation" : "conversations"}
                      </span>
                      <span className="w-24 text-right tabular-nums text-muted-foreground">
                        {t.unanswered > 0 ? `${t.unanswered} unanswered` : "all answered"}
                      </span>
                      <span className="w-20 text-right tabular-nums text-muted-foreground">
                        {formatDuration(t.medianFirstResponseSeconds)}
                      </span>
                    </div>
                  ))}
                  <div className="p-3 text-xs text-muted-foreground">
                    {data.untagged} conversation{data.untagged === 1 ? "" : "s"} without a tag. A conversation with
                    several tags counts under each.
                  </div>
                </div>
              )}
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
