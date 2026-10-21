import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { MessageThread } from "@/components/inbox/message-thread";
import type { Message } from "@/lib/types";

const get = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { get: (...a: unknown[]) => get(...a) } }));
vi.mock("@/hooks/use-messages", async (orig) => ({ ...(await orig<typeof import("@/hooks/use-messages")>()), useRetryMessage: () => ({ mutate: vi.fn(), isPending: false }) }));

const msg = (i: number): Message => ({
  id: `m${i}`, workspaceId: "w", conversationId: "c1", channelConnectionId: "cc", senderType: "CONTACT", direction: "INBOUND",
  messageType: "TEXT", content: `message ${i}`, status: "RECEIVED", sentAt: `2026-10-21T10:0${i}:00Z`, createdAt: "",
});

describe("MessageThread", () => {
  beforeEach(() => {
    get.mockResolvedValue({ items: [msg(3), msg(2), msg(1)], nextCursor: null }); // the API sends newest first
  });

  it("shows the messages oldest to newest", async () => {
    renderWithQuery(<MessageThread conversationId="c1" />);
    await screen.findByText("message 1");
    const order = screen.getAllByText(/^message \d$/).map((el) => el.textContent);
    expect(order).toEqual(["message 1", "message 2", "message 3"]);
    expect(get).toHaveBeenCalledWith("/conversations/c1/messages");
  });

  it("scrolls to the latest message when first opened", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView");
    renderWithQuery(<MessageThread conversationId="c1" />);
    await screen.findByText("message 1");
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });

  it("explains an empty conversation", async () => {
    get.mockResolvedValue({ items: [], nextCursor: null });
    renderWithQuery(<MessageThread conversationId="c1" />);
    expect(await screen.findByText("No messages yet")).toBeInTheDocument();
  });

  it("offers older messages when there are more, and prepends them", async () => {
    get.mockImplementation(async (path: string) => (path.includes("cursor=") ? { items: [msg(0)], nextCursor: null } : { items: [msg(3), msg(2), msg(1)], nextCursor: "older" }));
    renderWithQuery(<MessageThread conversationId="c1" />);
    await userEvent.click(await screen.findByRole("button", { name: "Load older messages" }));

    await screen.findByText("message 0");
    expect(get).toHaveBeenLastCalledWith("/conversations/c1/messages?cursor=older");
    expect(screen.getAllByText(/^message \d$/).map((el) => el.textContent)).toEqual(["message 0", "message 1", "message 2", "message 3"]);
    expect(screen.queryByRole("button", { name: "Load older messages" })).not.toBeInTheDocument();
  });

  it("doesn't offer older messages when it already has everything", async () => {
    renderWithQuery(<MessageThread conversationId="c1" />);
    await screen.findByText("message 1");
    expect(screen.queryByRole("button", { name: "Load older messages" })).not.toBeInTheDocument();
  });
});
