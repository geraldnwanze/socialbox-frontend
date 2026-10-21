import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { BulkActionBar } from "@/components/inbox/bulk-action-bar";

const post = vi.fn();
const toast = { success: vi.fn(), warning: vi.fn(), error: vi.fn() };
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { post: (...a: unknown[]) => post(...a) } }));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), warning: (...a: unknown[]) => toast.warning(...a), error: (...a: unknown[]) => toast.error(...a) } }));
vi.mock("@/hooks/use-team", () => ({
  useTeamMembers: () => ({ data: [{ id: "m1", user: { fullName: "Ann Lee" } }, { id: "m2", user: { fullName: "Bob Stone" } }] }),
}));
vi.mock("@/hooks/use-tags", () => ({ useTags: () => ({ data: [{ id: "t1", name: "Refund" }] }) }));

function setup(props: Partial<React.ComponentProps<typeof BulkActionBar>> = {}) {
  const onDone = vi.fn();
  const onClear = vi.fn();
  renderWithQuery(<BulkActionBar selectedIds={["c1", "c2", "c3"]} status="OPEN" onDone={onDone} onClear={onClear} {...props} />);
  return { onDone, onClear };
}

describe("BulkActionBar", () => {
  it("shows how many are selected and can clear the selection", async () => {
    const { onClear } = setup();
    expect(screen.getByText("3 selected")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Clear selection" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("resolves everything selected in one request and reports the result", async () => {
    post.mockResolvedValue({ updated: 3, failed: [] });
    const { onDone } = setup();

    await userEvent.click(screen.getByRole("button", { name: "Resolve selected" }));

    await waitFor(() => expect(post).toHaveBeenCalledWith("/conversations/bulk", { ids: ["c1", "c2", "c3"], action: { type: "RESOLVE" } }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Resolved 3 conversations"));
    expect(onDone).toHaveBeenCalledWith([]);
  });

  it("assigns to the chosen teammate, or unassigns", async () => {
    post.mockResolvedValue({ updated: 3, failed: [] });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Assign selected" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Bob Stone" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/conversations/bulk", { ids: ["c1", "c2", "c3"], action: { type: "ASSIGN", memberId: "m2" } }));

    await userEvent.click(screen.getByRole("button", { name: "Assign selected" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Unassign" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/conversations/bulk", { ids: ["c1", "c2", "c3"], action: { type: "ASSIGN", memberId: null } }));
  });

  it("sets priority", async () => {
    post.mockResolvedValue({ updated: 3, failed: [] });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Set priority" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Urgent" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/conversations/bulk", { ids: ["c1", "c2", "c3"], action: { type: "PRIORITY", priority: "URGENT" } }));
  });

  it("adds and removes tags", async () => {
    post.mockResolvedValue({ updated: 3, failed: [] });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Tag selected" }));
    const [add, remove] = await screen.findAllByRole("menuitem", { name: "Refund" });
    await userEvent.click(add);
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/conversations/bulk", { ids: ["c1", "c2", "c3"], action: { type: "ADD_TAG", tagId: "t1" } }));

    await userEvent.click(screen.getByRole("button", { name: "Tag selected" }));
    const items = await screen.findAllByRole("menuitem", { name: "Refund" });
    await userEvent.click(items[1] ?? remove);
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/conversations/bulk", { ids: ["c1", "c2", "c3"], action: { type: "REMOVE_TAG", tagId: "t1" } }));
  });

  it("keeps the failures selected and says how many couldn't be updated", async () => {
    post.mockResolvedValue({ updated: 2, failed: [{ id: "c3", reason: "Conversation not found" }] });
    const { onDone } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Resolve selected" }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalledWith("Resolved 2 conversations; 1 couldn't be updated"));
    expect(onDone).toHaveBeenCalledWith(["c3"]);
  });

  it("says nothing changed when the request itself fails", async () => {
    post.mockRejectedValue(new Error("network"));
    const { onDone } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Resolve selected" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/nothing was changed/i)));
    expect(onDone).not.toHaveBeenCalled();
  });

  it("offers the right status actions for each tab", async () => {
    const { unmount } = (setup({ status: "RESOLVED" }), { unmount: () => undefined });
    expect(screen.getByRole("button", { name: "Reopen selected" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolve selected" })).not.toBeInTheDocument();
    unmount();
  });

  it("uses singular wording for a single conversation", async () => {
    post.mockResolvedValue({ updated: 1, failed: [] });
    setup({ selectedIds: ["c1"] });
    await userEvent.click(screen.getByRole("button", { name: "Resolve selected" }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Resolved 1 conversation"));
  });
});
