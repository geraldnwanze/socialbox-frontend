import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { CustomerPanel } from "@/components/inbox/customer-panel";
import type { Conversation, ContactIdentity } from "@/lib/types";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), patch: (...a: unknown[]) => patch(...a) },
}));
vi.mock("@/components/inbox/activity-timeline", () => ({ ActivityTimeline: () => <div data-testid="timeline" /> }));
vi.mock("@/components/inbox/ai-summary-card", () => ({ AiSummaryCard: () => <div data-testid="ai-summary" /> }));
vi.mock("@/hooks/use-team", () => ({
  useTeamMembers: () => ({ data: [{ id: "m1", user: { fullName: "Ann Lee" } }, { id: "m2", user: { fullName: "Bob Stone" } }] }),
}));
vi.mock("@/hooks/use-tags", () => ({ useTags: () => ({ data: [{ id: "t1", name: "VIP", color: "#f00" }, { id: "t2", name: "Lead", color: "#0f0" }] }) }));
vi.mock("@/hooks/use-conversation-tags", () => ({ useConversationTags: () => ({ data: [{ id: "ct1", tagId: "t1", tag: { id: "t1", name: "VIP", color: "#f00" } }] }) }));

const identity = (over: Partial<ContactIdentity>): ContactIdentity => ({ id: "i1", channel: "TELEGRAM", channelConnectionId: "cc", externalUserId: "1", ...over });
const conversation = (over: Partial<Conversation> = {}): Conversation =>
  ({
    id: "c1", workspaceId: "w", channelConnectionId: "cc", contactId: "k1", externalConversationId: "e", status: "OPEN", priority: "NORMAL",
    assignedTo: null, unreadCount: 0, createdAt: "", updatedAt: "",
    contact: { id: "k1", workspaceId: "w", displayName: "Ann Lee", identities: [identity({ username: "annlee" })], createdAt: "" },
    ...over,
  }) as Conversation;

describe("CustomerPanel", () => {
  beforeEach(() => {
    post.mockResolvedValue(conversation());
    patch.mockResolvedValue(conversation());
    get.mockResolvedValue([]);
  });

  it("shows who the customer is, the conversation's state, their channels, and embeds the summary and activity", () => {
    renderWithQuery(<CustomerPanel conversation={conversation()} />);
    expect(screen.getByText("Ann Lee")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("@annlee")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument(); // applied tag
    expect(screen.getByTestId("ai-summary")).toBeInTheDocument();
    expect(screen.getByTestId("timeline")).toBeInTheDocument();
  });

  describe("status buttons", () => {
    it("open: resolve or park as pending", async () => {
      renderWithQuery(<CustomerPanel conversation={conversation()} />);
      await userEvent.click(screen.getByRole("button", { name: /mark as pending/i }));
      await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/c1/pending"));
      await userEvent.click(screen.getByRole("button", { name: /resolve conversation/i }));
      await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/c1/resolve"));
    });

    it("pending: move it back to open", async () => {
      renderWithQuery(<CustomerPanel conversation={conversation({ status: "PENDING" })} />);
      expect(screen.queryByRole("button", { name: /mark as pending/i })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /move back to open/i }));
      await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/c1/reopen"));
    });

    it("resolved: only reopen is offered", async () => {
      renderWithQuery(<CustomerPanel conversation={conversation({ status: "RESOLVED" })} />);
      expect(screen.queryByRole("button", { name: /resolve conversation/i })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole("button", { name: /reopen conversation/i }));
      await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/c1/reopen"));
    });
  });

  it("changes priority from the dropdown", async () => {
    renderWithQuery(<CustomerPanel conversation={conversation()} />);
    await userEvent.click(screen.getAllByRole("combobox")[0]); // priority comes first, then assignee
    await userEvent.click(await screen.findByRole("option", { name: "Urgent" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/conversations/c1", { priority: "URGENT" }));
  });

  it("assigns to a teammate, and can unassign", async () => {
    renderWithQuery(<CustomerPanel conversation={conversation({ assignedTo: "m1" })} />);
    const [, assignee] = screen.getAllByRole("combobox");
    expect(assignee).toHaveTextContent("Ann Lee");
    await userEvent.click(assignee);
    await userEvent.click(await screen.findByRole("option", { name: "Bob Stone" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/c1/assign", { assigneeMemberId: "m2" }));

    await userEvent.click(assignee);
    await userEvent.click(await screen.findByRole("option", { name: "Unassigned" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/conversations/c1/assign", { assigneeMemberId: null }));
  });

  describe("live chat visitor details", () => {
    const withVisitor = (metadata: Record<string, unknown> | undefined) =>
      conversation({ contact: { id: "k1", workspaceId: "w", displayName: "Website visitor", identities: [identity({ channel: "LIVE_CHAT", metadata })], createdAt: "" } as never });

    it("shows country (with flag and name), IP and the page, with the geolocation credit", () => {
      renderWithQuery(<CustomerPanel conversation={withVisitor({ ip: "8.8.8.8", countryCode: "NG", pageUrl: "https://shop.example.com/perfume/oud?utm=x" })} />);
      expect(screen.getByText(/Nigeria/)).toBeInTheDocument();
      expect(screen.getByText("8.8.8.8")).toBeInTheDocument();
      const page = screen.getByRole("link", { name: "shop.example.com/perfume/oud" });
      expect(page).toHaveAttribute("href", "https://shop.example.com/perfume/oud?utm=x");
      expect(page).toHaveAttribute("rel", "noopener noreferrer");
      expect(screen.getByRole("link", { name: "DB-IP" })).toBeInTheDocument();
    });

    it("never turns a visitor-supplied non-http URL into a link (it is untrusted input)", () => {
      renderWithQuery(<CustomerPanel conversation={withVisitor({ pageUrl: "javascript:alert(1)" })} />);
      expect(screen.queryByRole("link", { name: /javascript/i })).not.toBeInTheDocument();
      expect(screen.getByText("javascript:alert(1)")).toBeInTheDocument(); // shown as plain text
    });

    it("says when nothing has been captured, and shows Unknown for missing parts", () => {
      const { unmount } = renderWithQuery(<CustomerPanel conversation={withVisitor(undefined)} />);
      expect(screen.getByText("No visitor details captured yet.")).toBeInTheDocument();
      unmount();
      renderWithQuery(<CustomerPanel conversation={withVisitor({ ip: "1.2.3.4" })} />);
      expect(screen.getAllByText("Unknown")).toHaveLength(2); // country and page
    });

    it("copes with an unrecognised country code", () => {
      renderWithQuery(<CustomerPanel conversation={withVisitor({ countryCode: "ZZ", ip: "1.1.1.1" })} />);
      // Not a real region: it must still render something sensible instead of crashing.
      expect(within(screen.getByText("Country").closest("div") as HTMLElement).getByText(/Unknown Region|ZZ/)).toBeInTheDocument();
    });
  });

  it("shows an email customer's address rather than a @handle", () => {
    renderWithQuery(
      <CustomerPanel
        conversation={conversation({ contact: { id: "k1", workspaceId: "w", displayName: "Ann", identities: [identity({ channel: "EMAIL", username: "ann@x.com", externalUserId: "ann@x.com" })], createdAt: "" } as never })}
      />,
    );
    expect(screen.getByText("ann@x.com")).toBeInTheDocument();
    expect(screen.queryByText("@ann@x.com")).not.toBeInTheDocument();
  });
});
