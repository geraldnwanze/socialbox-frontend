import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { FiltersSidebar } from "@/components/inbox/filters-sidebar";
import { InboxFiltersProvider, useInboxFilters } from "@/components/inbox/inbox-filters-context";
import type { InboxView } from "@/lib/types";

const get = vi.fn();
const patch = vi.fn();
const del = vi.fn();
let views: InboxView[] = [];
vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a), delete: (...a: unknown[]) => del(...a) },
}));
vi.mock("@/hooks/use-channels", () => ({
  useChannels: () => ({
    data: {
      connected: [
        { id: "c1", type: "TELEGRAM", status: "CONNECTED", externalAccountName: "support_bot" },
        { id: "c2", type: "EMAIL", status: "CONNECTED", externalAccountName: "" },
        { id: "c3", type: "WHATSAPP", status: "DISCONNECTED", externalAccountName: "old" },
      ],
    },
  }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const view = (id: string, name: string, over: Partial<InboxView> = {}): InboxView => ({ id, name, shared: false, filters: { priority: "URGENT" }, ownerName: null, canEdit: true, ...over });

/** Shows what the filter context currently holds, so tests can assert on it. */
function Probe() {
  const { filters, activeViewId } = useInboxFilters();
  return <pre data-testid="probe">{JSON.stringify({ filters, activeViewId })}</pre>;
}
const probe = () => JSON.parse(screen.getByTestId("probe").textContent ?? "{}") as { filters: Record<string, unknown>; activeViewId: string | null };

function setup() {
  const Wrap = ({ children }: { children: ReactNode }) => <InboxFiltersProvider>{children}</InboxFiltersProvider>;
  return renderWithQuery(
    <Wrap>
      <FiltersSidebar />
      <Probe />
    </Wrap>,
  );
}

describe("FiltersSidebar", () => {
  beforeEach(() => {
    views = [view("v1", "Urgent refunds"), view("v2", "Team queue", { shared: true, ownerName: "Ann Lee", canEdit: false })];
    get.mockImplementation(async (path: string) => {
      if (path === "/inbox-views") return views;
      return { items: [{}, {}, {}], nextCursor: path.includes("unreadOnly") ? "more" : null };
    });
  });

  it("lists connected channels only (not disconnected ones), falling back to the channel's name", async () => {
    setup();
    expect(await screen.findByRole("button", { name: /support_bot/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Email/ })).toBeInTheDocument(); // no account name -> "Email"
    expect(screen.queryByText("old")).not.toBeInTheDocument();
  });

  it("shows counts, with a plus when there may be more than the first page", async () => {
    setup();
    await screen.findByRole("button", { name: /support_bot/ });
    await waitFor(() => expect(screen.getByRole("button", { name: /Unread/ })).toHaveTextContent("3+"));
    expect(screen.getByRole("button", { name: /^All/ })).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: /^All/ })).not.toHaveTextContent("3+");
  });

  it("choosing an inbox updates the filters, and All clears them", async () => {
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /Assigned to me/ }));
    expect(probe().filters).toEqual({ status: "OPEN", assignedTo: "me" });
    await userEvent.click(screen.getByRole("button", { name: /support_bot/ }));
    expect(probe().filters).toEqual({ status: "OPEN", channelConnectionId: "c1" });
    await userEvent.click(screen.getByRole("button", { name: /^All/ }));
    expect(probe().filters).toEqual({ status: "OPEN" });
  });

  it("shows saved views, marks shared ones, and applies one when clicked", async () => {
    setup();
    const mine = await screen.findByRole("button", { name: "Urgent refunds" });
    expect(mine).toHaveAttribute("title", "Only you can see this view");
    expect(screen.getByRole("button", { name: "Team queue" })).toHaveAttribute("title", "Shared by Ann Lee");

    await userEvent.click(mine);
    expect(probe()).toEqual({ filters: { status: "OPEN", priority: "URGENT" }, activeViewId: "v1" });
    expect(mine.className).toContain("bg-accent"); // highlighted as the active view
  });

  it("only offers view options (update/delete) where the person may edit", async () => {
    setup();
    await screen.findByRole("button", { name: "Urgent refunds" });
    expect(screen.getByRole("button", { name: "Options for Urgent refunds" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Options for Team queue" })).not.toBeInTheDocument();
  });

  it("deletes a view only after confirmation", async () => {
    del.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm");
    setup();
    await screen.findByRole("button", { name: "Urgent refunds" });

    confirm.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "Options for Urgent refunds" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete view" }));
    expect(del).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Options for Urgent refunds" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete view" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/inbox-views/v1"));
  });

  it("'update with current filters' overwrites the view with what is on screen", async () => {
    patch.mockResolvedValue({});
    setup();
    await userEvent.click(await screen.findByRole("button", { name: /Assigned to me/ }));
    await userEvent.click(screen.getByRole("button", { name: "Options for Urgent refunds" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Update with current filters" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/inbox-views/v1", { filters: { status: "OPEN", assignedTo: "me" } }));
  });

  it("hides the Views heading when there are none", async () => {
    views = [];
    setup();
    await screen.findByRole("button", { name: /support_bot/ });
    expect(screen.queryByText("Views")).not.toBeInTheDocument();
  });

  it("the Views section does not show inside other lists", async () => {
    setup();
    const sidebar = (await screen.findByText("Views")).closest("aside") as HTMLElement;
    expect(within(sidebar).getAllByText(/Channels|Views/)).toHaveLength(2);
  });
});
