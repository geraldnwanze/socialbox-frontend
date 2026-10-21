import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { SaveViewDialog } from "@/components/inbox/save-view-dialog";
import { ApiError } from "@/lib/api-client";

const mutateAsync = vi.fn();
let role = "OWNER";
const toast = { success: vi.fn() };

vi.mock("@/hooks/use-inbox-views", () => ({ useCreateInboxView: () => ({ mutateAsync, isPending: false }) }));
vi.mock("@/hooks/use-channels", () => ({ useChannels: () => ({ data: { connected: [], catalog: [] } }) }));
vi.mock("@/hooks/use-tags", () => ({ useTags: () => ({ data: [{ id: "t1", name: "Refund" }] }) }));
vi.mock("@/hooks/use-team", () => ({ useTeamMembers: () => ({ data: [] }) }));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w", role } }) }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a) } }));

const open = async (onSaved = vi.fn()) => {
  renderWithQuery(<SaveViewDialog filters={{ status: "OPEN", priority: "URGENT", tagId: "t1" }} onSaved={onSaved} trigger={<button>Save view</button>} />);
  await userEvent.click(screen.getByRole("button", { name: "Save view" }));
  return { onSaved, name: await screen.findByLabelText("Name") };
};

describe("SaveViewDialog", () => {
  beforeEach(() => {
    role = "OWNER";
    mutateAsync.mockImplementation(async (input) => ({ id: "v1", name: input.name, shared: input.shared, filters: input.filters }));
  });

  it("summarises what is being saved", async () => {
    await open();
    expect(screen.getByText("Open · Urgent priority · Tag: Refund")).toBeInTheDocument();
  });

  it("cannot be saved without a name", async () => {
    const { name } = await open();
    const save = screen.getAllByRole("button", { name: "Save view" }).find((b) => b.getAttribute("type") === "submit")!;
    expect(save).toBeDisabled();
    await userEvent.type(name, "   ");
    expect(save).toBeDisabled();
    await userEvent.type(name, "Urgent refunds");
    expect(save).toBeEnabled();
  });

  it("saves the filters under the name, privately by default, and hands the view back", async () => {
    const { onSaved, name } = await open();
    await userEvent.type(name, "  Urgent refunds ");
    await userEvent.keyboard("{Enter}");

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ name: "Urgent refunds", filters: { status: "OPEN", priority: "URGENT", tagId: "t1" }, shared: false }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ id: "v1", name: "Urgent refunds" })));
    expect(toast.success).toHaveBeenCalledWith('Saved view "Urgent refunds"');
  });

  it("lets admins share it with the team", async () => {
    const { name } = await open();
    await userEvent.type(name, "Team view");
    await userEvent.click(screen.getByLabelText(/share with the whole team/i));
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ shared: true })));
  });

  it("doesn't offer sharing to agents (and never sends it)", async () => {
    role = "AGENT";
    const { name } = await open();
    expect(screen.queryByLabelText(/share with the whole team/i)).not.toBeInTheDocument();
    await userEvent.type(name, "Mine");
    await userEvent.keyboard("{Enter}");
    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ shared: false })));
  });

  it("shows the server's reason when saving fails and keeps the dialog open", async () => {
    mutateAsync.mockRejectedValue(new ApiError(403, "FORBIDDEN", "You can save at most 30 views"));
    const { onSaved, name } = await open();
    await userEvent.type(name, "One too many");
    await userEvent.keyboard("{Enter}");
    expect(await screen.findByText("You can save at most 30 views")).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
