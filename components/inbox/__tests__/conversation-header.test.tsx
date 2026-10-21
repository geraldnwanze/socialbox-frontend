import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConversationHeader } from "@/components/inbox/conversation-header";
import type { Conversation } from "@/lib/types";

vi.mock("@/components/inbox/customer-panel", () => ({
  CustomerPanel: ({ conversation }: { conversation: Conversation }) => (
    <div data-testid="customer-panel">Panel for {conversation.contact?.displayName}</div>
  ),
}));

const conversation = { id: "c1", contact: { displayName: "Wendy Visitor" } } as Conversation;

describe("ConversationHeader (phone and tablet layouts)", () => {
  it("names the customer and links back to the conversation list", () => {
    render(<ConversationHeader conversation={conversation} />);
    expect(screen.getByText("Wendy Visitor")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to conversations" })).toHaveAttribute("href", "/inbox");
  });

  it("keeps the customer details closed until Details is pressed", async () => {
    render(<ConversationHeader conversation={conversation} />);
    expect(screen.queryByTestId("customer-panel")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Details" }));
    expect(await screen.findByTestId("customer-panel")).toHaveTextContent("Panel for Wendy Visitor");
  });
});
