import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import WorkspaceSettingsPage from "@/app/(app)/settings/workspace/page";

const patch = vi.fn();
const toast = { success: vi.fn(), error: vi.fn() };
let workspace: Record<string, unknown>;

vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { patch: (...a: unknown[]) => patch(...a) } }));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: workspace }) }));
vi.mock("@/hooks/use-tags", () => ({
  useTags: () => ({ data: [{ id: "t1", name: "VIP", color: "#6366F1" }], isLoading: false }),
  useCreateTag: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTag: () => ({ mutate: vi.fn() }),
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a), error: (...a: unknown[]) => toast.error(...a) } }));

describe("Workspace settings: privacy switches", () => {
  beforeEach(() => {
    workspace = { id: "w1", name: "Acme", role: "OWNER", sendReadReceipts: true, aiAssistEnabled: false };
    patch.mockResolvedValue({});
  });

  it("reflects the current settings", () => {
    renderWithQuery(<WorkspaceSettingsPage />);
    expect(screen.getByRole("switch", { name: "Send read receipts" })).toBeChecked();
    expect(screen.getByRole("switch", { name: "Enable AI assist" })).not.toBeChecked();
  });

  it("is honest that AI assist sends customer messages to a third party, before anyone turns it on", () => {
    renderWithQuery(<WorkspaceSettingsPage />);
    expect(screen.getByText(/are sent to Anthropic/i)).toBeInTheDocument();
    expect(screen.getByText(/card numbers and credential-like strings are removed/i)).toBeInTheDocument();
    expect(screen.getByText(/nothing is ever sent automatically/i)).toBeInTheDocument();
  });

  it("turns AI assist on with exactly that one change", async () => {
    renderWithQuery(<WorkspaceSettingsPage />);
    await userEvent.click(screen.getByRole("switch", { name: "Enable AI assist" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/workspace/settings", { aiAssistEnabled: true }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("AI assist on"));
  });

  it("turns read receipts off", async () => {
    renderWithQuery(<WorkspaceSettingsPage />);
    await userEvent.click(screen.getByRole("switch", { name: "Send read receipts" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/workspace/settings", { sendReadReceipts: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Read receipts off"));
  });

  it("reports a failure instead of pretending it worked", async () => {
    patch.mockRejectedValue(new Error("403"));
    renderWithQuery(<WorkspaceSettingsPage />);
    await userEvent.click(screen.getByRole("switch", { name: "Enable AI assist" }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Unable to update this setting"));
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("is read-only for people who aren't admins", () => {
    workspace = { ...workspace, role: "AGENT" };
    renderWithQuery(<WorkspaceSettingsPage />);
    // Base UI marks a disabled switch with aria-disabled rather than a native disabled attribute.
    expect(screen.getByRole("switch", { name: "Send read receipts" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("switch", { name: "Enable AI assist" })).toHaveAttribute("aria-disabled", "true");
  });
});
