import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { MessageBubble } from "@/components/inbox/message-bubble";
import type { Message } from "@/lib/types";

const retry = vi.fn();
vi.mock("@/hooks/use-messages", () => ({ useRetryMessage: () => ({ mutate: retry, isPending: false }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { get: vi.fn() } }));

const message = (over: Partial<Message> = {}): Message => ({
  id: "m1",
  workspaceId: "w1",
  conversationId: "c1",
  channelConnectionId: "cc1",
  senderType: "CONTACT",
  direction: "INBOUND",
  messageType: "TEXT",
  content: "Hello there",
  status: "RECEIVED",
  sentAt: "2026-10-21T10:00:00Z",
  createdAt: "2026-10-21T10:00:00Z",
  ...over,
});

describe("MessageBubble", () => {
  it("shows the text of a customer message with no status icon", () => {
    renderWithQuery(<MessageBubble message={message()} />);
    expect(screen.getByText("Hello there")).toBeInTheDocument();
    expect(screen.queryByLabelText(/sent|delivered|read/i)).not.toBeInTheDocument();
  });

  it.each([
    ["SENDING", "Sending"],
    ["SENT", "Sent"],
    ["DELIVERED", "Delivered"],
    ["READ", "Read by the customer"],
  ] as const)("labels an outbound %s message for hover and screen readers", (status, label) => {
    renderWithQuery(<MessageBubble message={message({ direction: "OUTBOUND", senderType: "AGENT", status })} />);
    expect(screen.getByLabelText(label)).toHaveAttribute("title", label);
  });

  it("explains a failed delivery and offers a retry", async () => {
    renderWithQuery(
      <MessageBubble
        message={message({ direction: "OUTBOUND", senderType: "AGENT", status: "FAILED", failureReason: "552 5.2.2 Mailbox full" })}
      />,
    );
    expect(screen.getByText("552 5.2.2 Mailbox full")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(retry).toHaveBeenCalledWith({ messageId: "m1", conversationId: "c1" });
  });

  it("marks messages sent by automation", () => {
    renderWithQuery(<MessageBubble message={message({ direction: "OUTBOUND", senderType: "SYSTEM", status: "SENT", content: "We're away" })} />);
    expect(screen.getByText("Automated reply")).toBeInTheDocument();
  });

  it("does not label an agent's own message as automated", () => {
    renderWithQuery(<MessageBubble message={message({ direction: "OUTBOUND", senderType: "AGENT", status: "SENT" })} />);
    expect(screen.queryByText("Automated reply")).not.toBeInTheDocument();
  });

  it("shows an email's subject above its text", () => {
    renderWithQuery(<MessageBubble message={message({ metadata: { subject: "Order 42" } })} />);
    expect(screen.getByText("Order 42")).toBeInTheDocument();
  });

  it("offers formatted view only for email with HTML, in a locked-down frame, and toggles back", async () => {
    renderWithQuery(<MessageBubble message={message({ metadata: { html: "<p>Hi <b>Ann</b></p>" } })} />);
    expect(screen.queryByTitle("Formatted email")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Show formatted" }));
    const frame = screen.getByTitle("Formatted email");
    expect(frame).toHaveAttribute("sandbox", "allow-same-origin allow-popups"); // no scripts, no forms
    expect(frame.getAttribute("srcdoc")).toContain("default-src 'none'"); // nothing fetched from the network
    expect(frame.getAttribute("srcdoc")).toContain("<p>Hi <b>Ann</b></p>");

    await userEvent.click(screen.getByRole("button", { name: "Show plain text" }));
    expect(screen.queryByTitle("Formatted email")).not.toBeInTheDocument();
  });

  it("never shows the formatted toggle on a plain message", () => {
    renderWithQuery(<MessageBubble message={message()} />);
    expect(screen.queryByRole("button", { name: /formatted/i })).not.toBeInTheDocument();
  });
});
