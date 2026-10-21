import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import RepliesSettingsPage from "@/app/(app)/settings/replies/page";
import { ApiError } from "@/lib/api-client";
import type { CannedResponse } from "@/lib/types";

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
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const reply = (id: string, shortcut: string, title: string): CannedResponse => ({ id, workspaceId: "w", shortcut, title, content: `${title} text`, createdAt: "", updatedAt: "" });

describe("Saved replies settings", () => {
  beforeEach(() => {
    role = "OWNER";
    get.mockResolvedValue([reply("r1", "shipping", "Shipping times"), reply("r2", "refund", "Refund policy")]);
  });

  it("lists replies with their shortcuts", async () => {
    renderWithQuery(<RepliesSettingsPage />);
    expect(await screen.findByText("Shipping times")).toBeInTheDocument();
    expect(screen.getByText("/shipping")).toBeInTheDocument();
    expect(screen.getByText("Refund policy text")).toBeInTheDocument();
  });

  it("lets agents read but not change them", async () => {
    role = "AGENT";
    renderWithQuery(<RepliesSettingsPage />);
    await screen.findByText("Shipping times");
    expect(screen.getByText(/only admins can add or edit/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /new reply/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete shipping times/i })).not.toBeInTheDocument();
  });

  it("explains an empty list differently to admins and agents", async () => {
    get.mockResolvedValue([]);
    const { unmount } = renderWithQuery(<RepliesSettingsPage />);
    expect(await screen.findByText(/shipping times, refund policy/i)).toBeInTheDocument();
    unmount();
    role = "AGENT";
    renderWithQuery(<RepliesSettingsPage />);
    expect(await screen.findByText("Ask an admin to add some.")).toBeInTheDocument();
  });

  it("creates a reply from the dialog", async () => {
    post.mockResolvedValue(reply("r3", "hello", "Greeting"));
    renderWithQuery(<RepliesSettingsPage />);
    await screen.findByText("Shipping times");
    await userEvent.click(screen.getByRole("button", { name: /new reply/i }));
    await userEvent.type(await screen.findByLabelText("Title"), "Greeting");
    await userEvent.type(screen.getByLabelText("Shortcut"), "hello");
    // paste, because userEvent.type treats "{{" as an escape for a single "{"
    await userEvent.click(screen.getByLabelText("Message"));
    await userEvent.paste("Hi {{customer_name}}");
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/canned-responses", { title: "Greeting", shortcut: "hello", content: "Hi {{customer_name}}" }));
  });

  it("shows the server's message when a shortcut is already taken", async () => {
    post.mockRejectedValue(new ApiError(409, "CONFLICT", 'The shortcut "/shipping" is already in use'));
    renderWithQuery(<RepliesSettingsPage />);
    await screen.findByText("Shipping times");
    await userEvent.click(screen.getByRole("button", { name: /new reply/i }));
    await userEvent.type(await screen.findByLabelText("Title"), "Dup");
    await userEvent.type(screen.getByLabelText("Shortcut"), "shipping");
    await userEvent.type(screen.getByLabelText("Message"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save reply" }));
    expect(await screen.findByText('The shortcut "/shipping" is already in use')).toBeInTheDocument();
  });

  it("edits an existing reply with its current values filled in", async () => {
    patch.mockResolvedValue({});
    renderWithQuery(<RepliesSettingsPage />);
    await screen.findByText("Shipping times");
    await userEvent.click(screen.getByRole("button", { name: "Edit Shipping times" }));
    const title = await screen.findByLabelText("Title");
    expect(title).toHaveValue("Shipping times");
    expect(screen.getByLabelText("Shortcut")).toHaveValue("shipping");
    await userEvent.clear(title);
    await userEvent.type(title, "Delivery times");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/canned-responses/r1", { title: "Delivery times", shortcut: "shipping", content: "Shipping times text" }));
  });

  it("deletes only after confirmation", async () => {
    del.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm");
    renderWithQuery(<RepliesSettingsPage />);
    await screen.findByText("Shipping times");
    confirm.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "Delete Refund policy" }));
    expect(del).not.toHaveBeenCalled();
    confirm.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Delete Refund policy" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/canned-responses/r2"));
  });
});
