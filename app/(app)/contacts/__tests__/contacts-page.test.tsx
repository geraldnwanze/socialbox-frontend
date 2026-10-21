import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import ContactsPage from "@/app/(app)/contacts/page";

const get = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { get: (...a: unknown[]) => get(...a) } }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));

const contact = (id: string, name: string, channels: string[]) => ({
  id, displayName: name, workspaceId: "w", createdAt: "",
  identities: channels.map((channel, i) => ({ id: `${id}-${i}`, channel, channelConnectionId: "c", externalUserId: "x" })),
});

describe("Contacts page", () => {
  it("lists contacts as links to their page, with the channels each is on", async () => {
    get.mockResolvedValue({ items: [contact("k1", "Ann Lee", ["EMAIL", "TELEGRAM"]), contact("k2", "Bob Stone", ["WHATSAPP"])], nextCursor: null });
    renderWithQuery(<ContactsPage />);
    const ann = (await screen.findByText("Ann Lee")).closest("a");
    expect(ann).toHaveAttribute("href", "/contacts/k1");
    expect(ann).toHaveTextContent("Email");
    expect(ann).toHaveTextContent("Telegram");
    expect(screen.getByText("Bob Stone").closest("a")).toHaveAttribute("href", "/contacts/k2");
  });

  it("falls back to 'Unknown' for a contact without a name", async () => {
    get.mockResolvedValue({ items: [contact("k3", "", [])].map((c) => ({ ...c, displayName: undefined })), nextCursor: null });
    renderWithQuery(<ContactsPage />);
    expect(await screen.findByText("Unknown")).toBeInTheDocument();
  });

  it("searches as you type (and encodes the query)", async () => {
    get.mockResolvedValue({ items: [], nextCursor: null });
    renderWithQuery(<ContactsPage />);
    await screen.findByText("No contacts yet");
    await userEvent.type(screen.getByPlaceholderText(/search by name/i), "a&b c");
    await waitFor(() => expect(get).toHaveBeenLastCalledWith("/contacts?search=a%26b%20c"));
  });

  it("explains that contacts appear automatically when customers write in", async () => {
    get.mockResolvedValue({ items: [], nextCursor: null });
    renderWithQuery(<ContactsPage />);
    expect(await screen.findByText(/created automatically when a customer messages you/i)).toBeInTheDocument();
  });
});
