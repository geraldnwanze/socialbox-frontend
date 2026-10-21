import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import ContactDetailPage from "@/app/(app)/contacts/[contactId]/page";
import { ApiError } from "@/lib/api-client";
import type { Contact, Conversation } from "@/lib/types";

const get = vi.fn();
const patch = vi.fn();
const post = vi.fn();
let role = "OWNER";

vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a), post: (...a: unknown[]) => post(...a) },
}));
vi.mock("next/navigation", () => ({ useParams: () => ({ contactId: "k1" }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w", role } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const contact = (over: Partial<Contact> = {}): Contact => ({
  id: "k1", workspaceId: "w", displayName: "Ann Lee", email: "ann@x.com", phone: "555", notes: "VIP",
  createdAt: "2026-01-02T00:00:00Z",
  identities: [
    { id: "i1", channel: "EMAIL", channelConnectionId: "c1", externalUserId: "ann@x.com", username: "ann@x.com" },
    { id: "i2", channel: "TELEGRAM", channelConnectionId: "c2", externalUserId: "99", username: "annlee" },
    { id: "i3", channel: "LIVE_CHAT", channelConnectionId: "c3", externalUserId: "v1", metadata: { countryCode: "NG" } },
  ],
  ...over,
});

function mockApi(c: Contact | Error, conversations: Partial<Conversation>[] = []) {
  get.mockImplementation(async (path: string) => {
    if (path === "/contacts/k1") {
      if (c instanceof Error) throw c;
      return c;
    }
    if (path === "/contacts/k1/conversations") return conversations;
    if (path.startsWith("/contacts")) return { items: [], nextCursor: null };
    throw new Error(`unexpected ${path}`);
  });
}

describe("Contact detail page", () => {
  beforeEach(() => {
    role = "OWNER";
    mockApi(contact());
  });

  it("shows the contact's details, channels and conversations", async () => {
    mockApi(contact(), [
      { id: "cv1", status: "OPEN", lastMessagePreview: "Where is my order?", channelConnection: { type: "EMAIL" } as never, lastMessageAt: new Date().toISOString() },
    ]);
    renderWithQuery(<ContactDetailPage />);
    expect(await screen.findByRole("heading", { name: "Ann Lee" })).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveValue("ann@x.com");
    expect(screen.getByLabelText("Phone")).toHaveValue("555");
    expect(screen.getByLabelText("Internal notes")).toHaveValue("VIP");

    // an email shows as an address, other channels as @handles, live chat with its country
    expect(screen.getAllByText("ann@x.com").length).toBeGreaterThan(0);
    expect(screen.getByText("@annlee")).toBeInTheDocument();
    expect(screen.getByText(/v1 · NG/)).toBeInTheDocument();

    const link = screen.getByText("Where is my order?").closest("a");
    expect(link).toHaveAttribute("href", "/inbox/cv1");
  });

  it("only enables Save once something changed, and saves every field", async () => {
    patch.mockResolvedValue(contact());
    renderWithQuery(<ContactDetailPage />);
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();

    const phone = screen.getByLabelText("Phone");
    await userEvent.clear(phone);
    await userEvent.type(phone, "777");
    expect(save).toBeEnabled();

    await userEvent.click(save);
    await waitFor(() =>
      expect(patch).toHaveBeenCalledWith("/contacts/k1", { displayName: "Ann Lee", email: "ann@x.com", phone: "777", notes: "VIP" }),
    );
  });

  it("clearing a field sends an empty value (which removes it)", async () => {
    patch.mockResolvedValue(contact());
    renderWithQuery(<ContactDetailPage />);
    await userEvent.clear(await screen.findByLabelText("Internal notes"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/contacts/k1", expect.objectContaining({ notes: "" })));
  });

  it("shows the server's message when saving fails", async () => {
    patch.mockImplementation(async () => {
      throw new ApiError(409, "CONFLICT", "That email address belongs to another contact");
    });
    renderWithQuery(<ContactDetailPage />);
    const email = await screen.findByLabelText("Email");
    await userEvent.clear(email);
    await userEvent.type(email, "taken@x.com");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("That email address belongs to another contact")).toBeInTheDocument();
  });

  it("offers merging a duplicate to admins only", async () => {
    renderWithQuery(<ContactDetailPage />);
    expect(await screen.findByRole("button", { name: /merge duplicate/i })).toBeInTheDocument();
  });

  it("hides merge from agents", async () => {
    role = "AGENT";
    renderWithQuery(<ContactDetailPage />);
    await screen.findByRole("heading", { name: "Ann Lee" });
    expect(screen.queryByRole("button", { name: /merge duplicate/i })).not.toBeInTheDocument();
  });

  it("merging needs a chosen duplicate, warns it can't be undone, and excludes the contact itself", async () => {
    get.mockImplementation(async (path: string) => {
      if (path === "/contacts/k1") return contact();
      if (path === "/contacts/k1/conversations") return [];
      return {
        items: [contact(), contact({ id: "k2", displayName: "Ann (duplicate)", identities: [] })],
        nextCursor: null,
      };
    });
    post.mockResolvedValue(contact());
    renderWithQuery(<ContactDetailPage />);
    await userEvent.click(await screen.findByRole("button", { name: /merge duplicate/i }));

    expect(await screen.findByText(/can't be undone/i)).toBeInTheDocument();
    const dialog = screen.getByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "Select a contact" });
    expect(confirm).toBeDisabled();
    expect(within(dialog).queryByText("Ann Lee")).not.toBeInTheDocument(); // not offered to merge into itself

    await userEvent.click(await within(dialog).findByText("Ann (duplicate)"));
    await userEvent.click(within(dialog).getByRole("button", { name: /merge ann \(duplicate\) in/i }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/contacts/k1/merge", { sourceContactId: "k2" }));
  });

  it("explains a contact that no longer exists (e.g. it was merged away)", async () => {
    mockApi(new ApiError(404, "RESOURCE_NOT_FOUND", "Contact not found"));
    renderWithQuery(<ContactDetailPage />);
    expect(await screen.findByText(/may have been merged/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to contacts/i })).toHaveAttribute("href", "/contacts");
  });
});
