import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import AutomationsSettingsPage from "@/app/(app)/settings/automations/page";
import type { AutomationRule } from "@/lib/types";

const get = vi.fn();
const post = vi.fn();
const patch = vi.fn();
const del = vi.fn();
let role: "OWNER" | "AGENT" = "OWNER";

vi.mock("@/lib/api-client", async (orig) => ({
  ...(await orig<typeof import("@/lib/api-client")>()),
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a), patch: (...a: unknown[]) => patch(...a), delete: (...a: unknown[]) => del(...a) },
}));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w", role } }) }));
vi.mock("@/hooks/use-tags", () => ({ useTags: () => ({ data: [{ id: "t1", name: "Refund" }] }) }));
vi.mock("@/hooks/use-team", () => ({ useTeamMembers: () => ({ data: [{ id: "m1", user: { fullName: "Ann Lee" } }] }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const rule = (id: string, name: string, over: Partial<AutomationRule> = {}): AutomationRule => ({
  id, name, enabled: true, position: 0, conditions: [{ type: "KEYWORDS", keywords: ["refund"] }],
  actions: [{ type: "ADD_TAG", tagId: "t1" }, { type: "SET_PRIORITY", priority: "HIGH" }], triggerCount: 0, ...over,
});

describe("Automations page", () => {
  beforeEach(() => {
    role = "OWNER";
    get.mockResolvedValue([rule("r1", "Spam filter"), rule("r2", "Welcome", { triggerCount: 3, lastTriggeredAt: new Date().toISOString() }), rule("r3", "Refunds", { enabled: false })]);
  });

  it("describes each rule in plain English with how often it ran", async () => {
    renderWithQuery(<AutomationsSettingsPage />);
    expect(await screen.findByText("Spam filter")).toBeInTheDocument();
    expect(screen.getAllByText(/it mentions "refund"/)).toHaveLength(3);
    expect(screen.getAllByText(/tag "Refund", set priority to High/)).toHaveLength(3);
    expect(screen.getAllByText("Hasn't run yet")).toHaveLength(2); // Spam filter and Refunds
    expect(screen.getByText(/Ran 3 times, last/)).toBeInTheDocument();
  });

  it("is for admins only: agents see an explanation and nothing is requested", async () => {
    role = "AGENT";
    renderWithQuery(<AutomationsSettingsPage />);
    expect(await screen.findByText(/managed by workspace admins/i)).toBeInTheDocument();
    expect(get).not.toHaveBeenCalled();
  });

  it("explains an empty list", async () => {
    get.mockResolvedValue([]);
    renderWithQuery(<AutomationsSettingsPage />);
    expect(await screen.findByText("No rules yet")).toBeInTheDocument();
  });

  it("switches a rule off and on", async () => {
    patch.mockResolvedValue({});
    renderWithQuery(<AutomationsSettingsPage />);
    await screen.findByText("Spam filter");
    await userEvent.click(screen.getByRole("switch", { name: "Disable Spam filter" }));
    await waitFor(() => expect(patch).toHaveBeenCalledWith("/automation-rules/r1", { enabled: false }));
    await userEvent.click(screen.getByRole("switch", { name: "Enable Refunds" }));
    await waitFor(() => expect(patch).toHaveBeenLastCalledWith("/automation-rules/r3", { enabled: true }));
  });

  it("moves a rule up and down by sending the complete new order", async () => {
    const byId = new Map([["r1", rule("r1", "Spam filter")], ["r2", rule("r2", "Welcome")], ["r3", rule("r3", "Refunds")]]);
    // Like the server: answer with the rules in the order that was asked for.
    post.mockImplementation(async (_path: string, body: { ids: string[] }) => body.ids.map((id) => byId.get(id)));
    renderWithQuery(<AutomationsSettingsPage />);
    await screen.findByText("Spam filter");

    await userEvent.click(screen.getByRole("button", { name: "Run Welcome earlier" }));
    await waitFor(() => expect(post).toHaveBeenCalledWith("/automation-rules/reorder", { ids: ["r2", "r1", "r3"] }));

    await userEvent.click(await screen.findByRole("button", { name: "Run Spam filter later" }));
    await waitFor(() => expect(post).toHaveBeenLastCalledWith("/automation-rules/reorder", { ids: ["r2", "r3", "r1"] }));
    const names = (await screen.findAllByRole("switch")).map((el) => el.getAttribute("aria-label"));
    expect(names).toEqual(["Disable Welcome", "Disable Refunds", "Disable Spam filter"]);
  });

  it("cannot move the first rule up or the last rule down", async () => {
    renderWithQuery(<AutomationsSettingsPage />);
    await screen.findByText("Spam filter");
    expect(screen.getByRole("button", { name: "Run Spam filter earlier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Run Refunds later" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Run Welcome earlier" })).toBeEnabled();
  });

  it("shows the order numbers rules run in", async () => {
    renderWithQuery(<AutomationsSettingsPage />);
    await screen.findByText("Spam filter");
    const first = screen.getByText("Spam filter").closest("div.flex.items-start") as HTMLElement;
    expect(within(first).getByText("1")).toBeInTheDocument();
  });

  it("deletes only after confirmation", async () => {
    del.mockResolvedValue(undefined);
    const confirm = vi.spyOn(window, "confirm");
    renderWithQuery(<AutomationsSettingsPage />);
    await screen.findByText("Spam filter");

    confirm.mockReturnValueOnce(false);
    await userEvent.click(screen.getByRole("button", { name: "Delete Welcome" }));
    expect(del).not.toHaveBeenCalled();

    confirm.mockReturnValueOnce(true);
    await userEvent.click(screen.getByRole("button", { name: "Delete Welcome" }));
    await waitFor(() => expect(del).toHaveBeenCalledWith("/automation-rules/r2"));
  });
});
