import { describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import AnalyticsPage from "@/app/(app)/analytics/page";
import type { AnalyticsOverview, WorkloadRow } from "@/lib/types";

const get = vi.fn();
let role: "OWNER" | "AGENT" = "OWNER";
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { get: (...a: unknown[]) => get(...a) } }));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w", role } }) }));

const row = (over: Partial<WorkloadRow>): WorkloadRow => ({
  memberId: "m1", name: "Ann Lee", open: 0, pending: 0, unread: 0, awaitingReply: 0, oldestWaitingSince: null,
  highPriority: 0, resolved: 0, messagesSent: 0, medianFirstResponseSeconds: null, ...over,
});

const overview = (over: Partial<AnalyticsOverview> = {}): AnalyticsOverview => ({
  range: { days: 7, from: "", to: "" },
  totals: { newConversations: 12, answered: 10, unanswered: 2, resolved: 8, inboundMessages: 40, outboundMessages: 25 },
  firstResponse: { count: 10, avgSeconds: 300, medianSeconds: 252, p90Seconds: 900 },
  resolution: { count: 8, avgSeconds: 7200, medianSeconds: 5400, p90Seconds: 10000 },
  daily: [{ date: "2026-10-20", conversations: 5 }, { date: "2026-10-21", conversations: 7 }],
  byChannel: [{ channelConnectionId: "c1", type: "EMAIL", name: "Support", conversations: 1, answered: 1, medianFirstResponseSeconds: 60 }],
  byAgent: [{ memberId: "m1", name: "Ann Lee", firstReplies: 1, medianFirstResponseSeconds: 60 }],
  byTag: [{ tagId: "t1", name: "Refund", color: "#ef4444", conversations: 3, answered: 2, unanswered: 1, medianFirstResponseSeconds: 120 }],
  untagged: 9,
  workload: {
    unassigned: row({ memberId: null, name: "Unassigned", open: 4, awaitingReply: 2 }),
    members: [row({ name: "Ann Lee", open: 3, pending: 1, awaitingReply: 1, highPriority: 2, resolved: 5, messagesSent: 20, medianFirstResponseSeconds: 90 })],
    backlog: { awaitingReply: 3, oldestWaitingSince: new Date(Date.now() - 3 * 3600_000).toISOString() },
  },
  ...over,
});

describe("Analytics page", () => {
  it("is for admins only", async () => {
    role = "AGENT";
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText(/available to workspace admins/i)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
    role = "OWNER";
  });

  it("shows the headline numbers with readable durations", async () => {
    get.mockResolvedValue(overview());
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText("New conversations")).toBeInTheDocument();
    expect(screen.getByText("New conversations").parentElement).toHaveTextContent("12");
    expect(screen.getByText("4m 12s")).toBeInTheDocument(); // median first response
    expect(screen.getByText("1h 30m")).toBeInTheDocument(); // median resolution
    expect(screen.getByText("Awaiting first reply").parentElement).toHaveTextContent("2"); // awaiting first reply
  });

  it("asks for the chosen period", async () => {
    get.mockResolvedValue(overview());
    renderWithQuery(<AnalyticsPage />);
    await screen.findByText("12");
    expect(get).toHaveBeenLastCalledWith("/analytics/overview?days=7");
    await userEvent.click(screen.getByRole("button", { name: "30d" }));
    await screen.findByText("12");
    expect(get).toHaveBeenLastCalledWith("/analytics/overview?days=30");
    expect(screen.getByRole("button", { name: "30d" })).toHaveAttribute("aria-pressed", "true");
  });

  it("shows the team workload with the unassigned row first and the backlog summarised", async () => {
    get.mockResolvedValue(overview());
    renderWithQuery(<AnalyticsPage />);
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Unassigned");
    expect(rows[1]).toHaveTextContent("Ann Lee");
    expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["Ann Lee", "3", "1", "1", "—", "2", "5", "20", "1m 30s"]);
    expect(screen.getByText(/3 waiting on a reply, the longest for 3 hours/)).toBeInTheDocument();
  });

  it("says so when nothing is waiting on a reply", async () => {
    const o = overview();
    o.workload.backlog = { awaitingReply: 0, oldestWaitingSince: null };
    get.mockResolvedValue(o);
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText("Nothing is waiting on a reply right now.")).toBeInTheDocument();
  });

  it("shows conversations by tag, including what has no tag", async () => {
    get.mockResolvedValue(overview());
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText("Refund")).toBeInTheDocument();
    expect(screen.getByText("3 conversations")).toBeInTheDocument();
    expect(screen.getByText("1 unanswered")).toBeInTheDocument();
    expect(screen.getByText(/9 conversations without a tag/)).toBeInTheDocument();
  });

  it("explains an empty tag report", async () => {
    get.mockResolvedValue(overview({ byTag: [], untagged: 4 }));
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText(/No tagged conversations in this period \(4 without a tag\)/)).toBeInTheDocument();
  });

  it("handles a period with no activity", async () => {
    get.mockResolvedValue(
      overview({
        totals: { newConversations: 0, answered: 0, unanswered: 0, resolved: 0, inboundMessages: 0, outboundMessages: 0 },
        firstResponse: { count: 0, avgSeconds: null, medianSeconds: null, p90Seconds: null },
        resolution: { count: 0, avgSeconds: null, medianSeconds: null, p90Seconds: null },
        byChannel: [],
        byAgent: [],
      }),
    );
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText("No conversations in this period.")).toBeInTheDocument();
    expect(screen.getByText("No replies in this period.")).toBeInTheDocument();
  });

  it("tells the admin when the data could not be loaded", async () => {
    get.mockRejectedValue(new Error("down"));
    renderWithQuery(<AnalyticsPage />);
    expect(await screen.findByText(/unable to load analytics/i)).toBeInTheDocument();
  });
});
