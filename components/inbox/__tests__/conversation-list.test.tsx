import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { ConversationList } from "@/components/inbox/conversation-list";
import { InboxFiltersProvider } from "@/components/inbox/inbox-filters-context";
import type { Conversation } from "@/lib/types";

const get = vi.fn();
const post = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));
vi.mock("next/navigation", () => ({ useParams: () => ({}), usePathname: () => "/inbox", useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));
vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));
vi.mock("@/hooks/use-team", () => ({ useTeamMembers: () => ({ data: [] }) }));
vi.mock("@/hooks/use-tags", () => ({ useTags: () => ({ data: [] }) }));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w", role: "OWNER" } }) }));
vi.mock("@/hooks/use-channels", () => ({ useChannels: () => ({ data: { connected: [], catalog: [] } }) }));
vi.mock("@/hooks/use-inbox-views", () => ({
  useCreateInboxView: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const conversation = (i: number, over: Partial<Conversation> = {}): Conversation =>
  ({
    id: `c${i}`,
    workspaceId: "w",
    channelConnectionId: "cc",
    contactId: `k${i}`,
    externalConversationId: `e${i}`,
    status: "OPEN",
    priority: "NORMAL",
    unreadCount: 0,
    createdAt: "",
    updatedAt: "",
    lastMessageAt: new Date().toISOString(),
    lastMessagePreview: `preview ${i}`,
    contact: { id: `k${i}`, workspaceId: "w", displayName: `Customer ${i}`, identities: [], createdAt: "" },
    ...over,
  }) as Conversation;

const page = (from: number, to: number, nextCursor: string | null) => ({
  items: Array.from({ length: to - from + 1 }, (_, i) => conversation(from + i)),
  nextCursor,
});

function setup() {
  return renderWithQuery(
    <InboxFiltersProvider>
      <ConversationList />
    </InboxFiltersProvider>,
  );
}

describe("ConversationList", () => {
  beforeEach(() => {
    get.mockImplementation(async (path: string) => (path.includes("cursor=") ? page(4, 5, null) : page(1, 3, "next-page")));
  });

  it("loads the first page and then the rest with 'Load more'", async () => {
    setup();
    expect(await screen.findByText("Customer 1")).toBeInTheDocument();
    expect(screen.queryByText("Customer 4")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Load more" }));

    expect(await screen.findByText("Customer 5")).toBeInTheDocument();
    expect(get).toHaveBeenLastCalledWith(expect.stringContaining("cursor=next-page"));
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument(); // nothing left
  });

  it("asks the server for open conversations, and for the tab you pick", async () => {
    setup();
    await screen.findByText("Customer 1");
    expect(get.mock.calls[0][0]).toContain("status=OPEN");
    await userEvent.click(screen.getByRole("tab", { name: "Resolved" }));
    await waitFor(() => expect(get.mock.calls.at(-1)?.[0]).toContain("status=RESOLVED"));
  });

  it("shows priority badges for high and urgent only", async () => {
    get.mockResolvedValue({ items: [conversation(1, { priority: "URGENT" }), conversation(2, { priority: "HIGH" }), conversation(3, { priority: "LOW" })], nextCursor: null });
    setup();
    await screen.findByText("Customer 1");
    expect(screen.getByText("Urgent")).toBeInTheDocument();
    expect(screen.getByText("High")).toBeInTheDocument();
    expect(screen.queryByText("Low")).not.toBeInTheDocument();
  });

  it("opens a conversation by clicking it normally, but selects instead in select mode", async () => {
    setup();
    const row = await screen.findByText("Customer 1");
    expect(row.closest("a")).toHaveAttribute("href", "/inbox/c1");

    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.queryByRole("link")).not.toBeInTheDocument(); // rows are selectable buttons now
    await userEvent.click(screen.getByText("Customer 2"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Customer 2" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Customer 1" })).not.toBeChecked();
  });

  it("shift-click selects the whole range, and shift-click again deselects it", async () => {
    get.mockResolvedValue(page(1, 5, null));
    setup();
    await screen.findByText("Customer 1");
    await userEvent.click(screen.getByRole("button", { name: "Select" }));

    // One user-event instance, so the held Shift key carries over to the click.
    const user = userEvent.setup();
    await user.click(screen.getByText("Customer 2"));
    await user.keyboard("{Shift>}");
    await user.click(screen.getByText("Customer 5"));
    await user.keyboard("{/Shift}");
    expect(screen.getByText("4 selected")).toBeInTheDocument(); // 2,3,4,5

    await user.keyboard("{Shift>}");
    await user.click(screen.getByText("Customer 3"));
    await user.keyboard("{/Shift}");
    // The range from the last click (5) back to 3 is switched off, leaving just Customer 2.
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Select Customer 2" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Select Customer 4" })).not.toBeChecked();
  });

  it("'select all loaded' selects what is on screen and says when there is more", async () => {
    setup();
    await screen.findByText("Customer 1");
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    expect(screen.getByText("Select all 3 loaded (more below)")).toBeInTheDocument();

    await userEvent.click(screen.getByLabelText(/Select all 3 loaded/));
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    expect(screen.getByText("Clear selection")).toBeInTheDocument();
  });

  it("applies a bulk action to exactly the selected conversations, then leaves select mode", async () => {
    post.mockResolvedValue({ updated: 2, failed: [] });
    setup();
    await screen.findByText("Customer 1");
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByText("Customer 1"));
    await userEvent.click(screen.getByText("Customer 3"));

    await userEvent.click(screen.getByRole("button", { name: "Resolve selected" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/bulk", { ids: ["c1", "c3"], action: { type: "RESOLVE" } }));
    await waitFor(() => expect(screen.queryByText(/selected/)).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Select" })).toHaveAttribute("aria-pressed", "false");
  });

  it("Escape leaves select mode and drops the selection", async () => {
    setup();
    await screen.findByText("Customer 1");
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByText("Customer 1"));
    expect(screen.getByText("1 selected")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("1 selected")).not.toBeInTheDocument();
  });

  it("drops conversations from the selection when they leave the list", async () => {
    setup();
    await screen.findByText("Customer 1");
    await userEvent.click(screen.getByRole("button", { name: "Select" }));
    await userEvent.click(screen.getByText("Customer 1"));
    await userEvent.click(screen.getByText("Customer 2"));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Switching tab shows a different set, so the old selection must not leak into it.
    get.mockResolvedValue({ items: [conversation(9)], nextCursor: null });
    await userEvent.click(screen.getByRole("tab", { name: "Pending" }));
    await screen.findByText("Customer 9");
    expect(screen.queryByText(/selected/)).not.toBeInTheDocument();
  });

  it("explains an empty inbox", async () => {
    get.mockResolvedValue({ items: [], nextCursor: null });
    setup();
    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    expect(within(document.body).queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });
});
