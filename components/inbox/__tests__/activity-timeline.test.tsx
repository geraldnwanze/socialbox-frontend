import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { ActivityTimeline } from "@/components/inbox/activity-timeline";
import type { ConversationEvent } from "@/lib/types";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

let n = 0;
const event = (over: Partial<ConversationEvent>): ConversationEvent => ({
  id: `e${++n}`,
  type: "CREATED",
  data: {},
  createdAt: new Date().toISOString(),
  actor: null,
  ...over,
});
const ann = { id: "m1", name: "Ann Lee" };

describe("ActivityTimeline", () => {
  beforeEach(() => {
    n = 0;
  });

  it("describes every kind of event in plain language, newest first", async () => {
    get.mockResolvedValue([
      event({ type: "CREATED" }),
      event({ type: "ASSIGNED", actor: ann, data: { toName: "Bob Stone" } }),
      event({ type: "ASSIGNED", actor: ann, data: { toName: "Ann Lee" } }),
      event({ type: "UNASSIGNED", actor: ann }),
      event({ type: "STATUS_CHANGED", actor: ann, data: { from: "OPEN", to: "RESOLVED" } }),
      event({ type: "STATUS_CHANGED", actor: null, data: { from: "RESOLVED", to: "OPEN", auto: true } }),
      event({ type: "PRIORITY_CHANGED", actor: ann, data: { from: "NORMAL", to: "URGENT" } }),
      event({ type: "TAG_ADDED", actor: ann, data: { tagName: "VIP" } }),
      event({ type: "TAG_REMOVED", actor: ann, data: { tagName: "VIP" } }),
    ]);
    renderWithQuery(<ActivityTimeline conversationId="c1" />);

    const items = await screen.findAllByRole("listitem");
    expect(items.map((li) => li.textContent?.replace(/\s+/g, " ").replace(/less than a minute ago|\d+ \w+ ago/, "").trim())).toEqual([
      'Ann Lee removed the tag "VIP"',
      'Ann Lee added the tag "VIP"',
      "Ann Lee set the priority to Urgent",
      "The customer replied, so it was reopened",
      "Ann Lee resolved this",
      "Ann Lee unassigned this",
      "Ann Lee took this conversation",
      "Ann Lee assigned this to Bob Stone",
      "Conversation started",
    ]);
  });

  it("credits automation by rule name, not the customer", async () => {
    get.mockResolvedValue([event({ type: "TAG_ADDED", actor: null, data: { tagName: "Refund", via: "automation", rule: "Refund requests" } })]);
    renderWithQuery(<ActivityTimeline conversationId="c1" />);
    expect(await screen.findByText('Automation "Refund requests" added the tag "Refund"')).toBeInTheDocument();
  });

  it("shows internal notes as notes, with who wrote them", async () => {
    get.mockResolvedValue([event({ type: "NOTE", actor: ann, data: { text: "Called them, follow up Monday" } })]);
    renderWithQuery(<ActivityTimeline conversationId="c1" />);
    expect(await screen.findByText("Called them, follow up Monday")).toBeInTheDocument();
    expect(screen.getByText(/Ann Lee ·/)).toBeInTheDocument();
  });

  it("saves a trimmed note, clears the box and refreshes the timeline", async () => {
    get.mockResolvedValue([]);
    post.mockResolvedValue({ status: "ok" });
    renderWithQuery(<ActivityTimeline conversationId="c1" />);
    const box = await screen.findByLabelText("Internal note");
    const button = screen.getByRole("button", { name: /add note/i });
    expect(button).toBeDisabled();

    await userEvent.type(box, "  Remember to refund  ");
    await userEvent.click(button);

    await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/c1/notes", { text: "Remember to refund" }));
    await waitFor(() => expect(box).toHaveValue(""));
    expect(get.mock.calls.length).toBeGreaterThan(1); // refetched
  });

  it("never lets an empty note be submitted", async () => {
    get.mockResolvedValue([]);
    renderWithQuery(<ActivityTimeline conversationId="c1" />);
    const box = await screen.findByLabelText("Internal note");
    await userEvent.type(box, "   ");
    expect(screen.getByRole("button", { name: /add note/i })).toBeDisabled();
    expect(within(document.body).queryByText(/Saving/)).not.toBeInTheDocument();
  });
});
