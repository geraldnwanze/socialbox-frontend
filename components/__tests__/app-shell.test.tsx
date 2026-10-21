import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { AppShell } from "@/components/app-shell";

const push = vi.fn();
const logout = vi.fn();
const switchWorkspace = vi.fn();
const markAllRead = vi.fn();
let pathname = "/inbox";
let role = "OWNER";
let notifications: { id: string; type: string; createdAt: string; readAt: string | null }[] = [];
const playSound = vi.fn();

vi.mock("next/navigation", () => ({ usePathname: () => pathname, useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => <a href={href} {...rest}>{children}</a> }));
vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { fullName: "Ann Lee", email: "ann@x.com" }, logout }) }));
vi.mock("@/providers/workspace-provider", () => ({
  useWorkspace: () => ({
    activeWorkspace: { id: "w1", name: "Acme", role },
    workspaces: [{ id: "w1", name: "Acme" }, { id: "w2", name: "Other Co" }],
    switchWorkspace,
  }),
}));
vi.mock("@/hooks/use-notifications", () => ({
  useNotifications: () => ({ data: notifications }),
  useMarkAllNotificationsRead: () => ({ mutate: markAllRead }),
}));
vi.mock("@/lib/notification-sound", () => ({
  isSoundEnabled: () => localStorage.getItem("socialbox_sound_enabled") !== "false",
  setSoundEnabled: (v: boolean) => localStorage.setItem("socialbox_sound_enabled", String(v)),
  playMessageSound: (...a: unknown[]) => playSound(...a),
}));

describe("AppShell", () => {
  beforeEach(() => {
    pathname = "/inbox";
    role = "OWNER";
    notifications = [];
    localStorage.clear();
  });

  it("shows the main navigation with the current section highlighted", () => {
    renderWithQuery(<AppShell>content</AppShell>);
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Inbox" }).className).toContain("bg-accent");
    expect(screen.getByRole("link", { name: "Contacts" }).className).not.toContain("bg-accent");
    expect(screen.getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/settings/channels");
  });

  it("keeps 'Settings' highlighted on every settings sub-page", () => {
    pathname = "/settings/automations";
    renderWithQuery(<AppShell>x</AppShell>);
    expect(screen.getByRole("link", { name: "Settings" }).className).toContain("bg-accent");
  });

  it("shows Analytics to admins and owners, hides it from agents", () => {
    const { unmount } = renderWithQuery(<AppShell>x</AppShell>);
    expect(screen.getByRole("link", { name: "Analytics" })).toHaveAttribute("href", "/analytics");
    unmount();
    role = "AGENT";
    renderWithQuery(<AppShell>x</AppShell>);
    expect(screen.queryByRole("link", { name: "Analytics" })).not.toBeInTheDocument();
  });

  it("shows the workspace name and the user's initials", () => {
    renderWithQuery(<AppShell>x</AppShell>);
    expect(screen.getByText("Acme")).toBeInTheDocument();
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("switches workspace from the menu", async () => {
    renderWithQuery(<AppShell>x</AppShell>);
    await userEvent.click(screen.getByText("Acme"));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Other Co" }));
    expect(switchWorkspace).toHaveBeenCalledWith("w2");
  });

  it("signs out and opens team settings from the account menu", async () => {
    renderWithQuery(<AppShell>x</AppShell>);
    await userEvent.click(screen.getByText("AL"));
    expect(await screen.findByText("ann@x.com")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: "Team settings" }));
    expect(push).toHaveBeenCalledWith("/settings/team");

    await userEvent.click(screen.getByText("AL"));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Sign out" }));
    expect(logout).toHaveBeenCalled();
  });

  describe("message sound toggle", () => {
    it("mutes and unmutes, remembering the choice, and plays a sample when unmuted", async () => {
      renderWithQuery(<AppShell>x</AppShell>);
      await userEvent.click(screen.getByRole("button", { name: "Mute message sounds" }));
      expect(localStorage.getItem("socialbox_sound_enabled")).toBe("false");
      expect(playSound).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Unmute message sounds" }));
      expect(localStorage.getItem("socialbox_sound_enabled")).toBe("true");
      expect(playSound).toHaveBeenCalledTimes(1);
    });

    it("starts muted if the user muted it before", () => {
      localStorage.setItem("socialbox_sound_enabled", "false");
      renderWithQuery(<AppShell>x</AppShell>);
      expect(screen.getByRole("button", { name: "Unmute message sounds" })).toBeInTheDocument();
    });
  });

  describe("notifications", () => {
    it("shows a dot only when something is unread, and marks everything read when opened", async () => {
      notifications = [{ id: "n1", type: "CONVERSATION_ASSIGNED", createdAt: "2026-10-21T10:00:00Z", readAt: null }];
      const { container } = renderWithQuery(<AppShell>x</AppShell>);
      expect(container.querySelector(".bg-red-500")).toBeInTheDocument();

      const bell = container.querySelector("svg.lucide-bell")!.closest("button")!;
      await userEvent.click(bell);
      expect(await screen.findByText("A conversation was assigned to you")).toBeInTheDocument();
      await waitFor(() => expect(markAllRead).toHaveBeenCalled());
    });

    it("has no dot and says so when you're all caught up", async () => {
      notifications = [{ id: "n1", type: "CONVERSATION_ASSIGNED", createdAt: "2026-10-21T10:00:00Z", readAt: "2026-10-21T11:00:00Z" }];
      const { container } = renderWithQuery(<AppShell>x</AppShell>);
      expect(container.querySelector(".bg-red-500")).not.toBeInTheDocument();
      await userEvent.click(container.querySelector("svg.lucide-bell")!.closest("button")!);
      expect(markAllRead).not.toHaveBeenCalled(); // nothing to mark
    });
  });
});
