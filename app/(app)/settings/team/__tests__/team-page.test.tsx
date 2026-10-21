import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import TeamSettingsPage from "@/app/(app)/settings/team/page";
import { ApiError } from "@/lib/api-client";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
let role = "OWNER";

vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), patch: (...a: unknown[]) => patch(...a), delete: (...a: unknown[]) => del(...a) },
}));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w", role } }) }));
vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const member = (id: string, userId: string, fullName: string, memberRole: string) => ({
  id, role: memberRole, workspaceId: "w", userId, user: { id: userId, fullName, email: `${fullName.split(" ")[0].toLowerCase()}@x.com` },
});

describe("Team settings", () => {
  beforeEach(() => {
    role = "OWNER";
    get.mockResolvedValue([member("m1", "u1", "Ann Lee", "OWNER"), member("m2", "u2", "Bob Stone", "AGENT")]);
  });

  it("lists everyone with their email and role, and marks you", async () => {
    role = "AGENT";
    renderWithQuery(<TeamSettingsPage />);
    expect(await screen.findByText("Ann Lee")).toBeInTheDocument();
    expect(screen.getByText("(you)")).toBeInTheDocument();
    expect(screen.getByText("bob@x.com")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Agent")).toBeInTheDocument();
  });

  it("is read-only for agents: no invite, no role changes, no removal", async () => {
    role = "AGENT";
    renderWithQuery(<TeamSettingsPage />);
    await screen.findByText("Ann Lee");
    expect(screen.queryByRole("button", { name: /add|invite/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /remove/i })).not.toBeInTheDocument();
  });

  it("lets admins remove someone, but only after confirmation", async () => {
    del.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm");
    renderWithQuery(<TeamSettingsPage />);
    await screen.findByText("Bob Stone");

    confirm.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "Remove Bob Stone" }));
    expect(del).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Remove Bob Stone" }));
    expect(confirm).toHaveBeenLastCalledWith("Remove Bob Stone from this workspace?");
    await waitFor(() => expect(del).toHaveBeenCalledWith("/workspace/members/m2"));
  });

  it("adds a teammate by email as an agent by default", async () => {
    post.mockResolvedValue({});
    renderWithQuery(<TeamSettingsPage />);
    await screen.findByText("Ann Lee");
    await userEvent.click(screen.getByRole("button", { name: /add|invite/i }));
    await userEvent.type(await screen.findByLabelText(/email/i), "carol@x.com");
    await userEvent.click(screen.getByRole("button", { name: /^add|send|invite/i, hidden: false }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/workspace/members", { email: "carol@x.com", role: "AGENT" }));
  });

  it("explains why someone couldn't be added (e.g. they haven't registered yet)", async () => {
    post.mockRejectedValue(new ApiError(404, "RESOURCE_NOT_FOUND", "User not found — ask them to register first"));
    renderWithQuery(<TeamSettingsPage />);
    await screen.findByText("Ann Lee");
    await userEvent.click(screen.getByRole("button", { name: /add|invite/i }));
    await userEvent.type(await screen.findByLabelText(/email/i), "ghost@x.com");
    await userEvent.click(screen.getByRole("button", { name: /^add|send|invite/i }));
    expect(await screen.findByText("User not found — ask them to register first")).toBeInTheDocument();
  });
});
