import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import ChannelsSettingsPage from "@/app/(app)/settings/channels/page";
import type { ChannelConnection } from "@/lib/types";

const disconnect = vi.fn();
const toast = { success: vi.fn() };
let data: unknown;
let isLoading = false;

vi.mock("@/hooks/use-channels", () => ({
  useChannels: () => ({ data, isLoading }),
  useDisconnectChannel: () => ({ mutate: disconnect, isPending: false }),
}));
// The connect form has its own tests; here it is just a button that says what it would open.
vi.mock("@/components/settings/connect-channel-dialog", () => ({
  ConnectChannelDialog: ({ type, connection, prefillFrom, trigger }: { type: string; connection?: ChannelConnection; prefillFrom?: ChannelConnection; trigger: React.ReactNode }) => (
    <span data-testid={`dialog-${type}`} data-editing={connection?.id ?? ""} data-prefill={prefillFrom?.id ?? ""}>
      {trigger}
    </span>
  ),
}));
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => toast.success(...a) } }));

const conn = (over: Partial<ChannelConnection>): ChannelConnection =>
  ({ id: "c1", workspaceId: "w", type: "TELEGRAM", provider: "x", status: "CONNECTED", externalAccountId: "bot1", externalAccountName: "support_bot", createdAt: "", updatedAt: "", ...over }) as ChannelConnection;

const catalog = [
  { type: "TELEGRAM", available: true },
  { type: "EMAIL", available: true },
  { type: "LIVE_CHAT", available: true },
  { type: "X", available: false, reason: "Pending — requires a billed X API account" },
  { type: "TIKTOK", available: false, reason: "Planned — pending TikTok Business Partner approval" },
];

describe("Channels settings", () => {
  beforeEach(() => {
    isLoading = false;
    data = { connected: [], catalog };
  });

  it("shows a spinner while loading", () => {
    isLoading = true;
    renderWithQuery(<ChannelsSettingsPage />);
    expect(screen.queryByText("Channels")).not.toBeInTheDocument();
  });

  it("offers to connect anything available, and says why the rest can't be", () => {
    renderWithQuery(<ChannelsSettingsPage />);
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(3);
    expect(screen.getByText("Pending — requires a billed X API account")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Coming soon" })).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Coming soon" }).every((b) => b.hasAttribute("disabled"))).toBe(true);
  });

  it("shows a connected channel with its account, status and a disconnect button", async () => {
    data = { connected: [conn({})], catalog };
    renderWithQuery(<ChannelsSettingsPage />);
    expect(screen.getByText("support_bot")).toBeInTheDocument();
    expect(screen.getByText("CONNECTED")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Connect" })).toHaveLength(2); // the other two types

    await userEvent.click(screen.getByRole("button", { name: /disconnect/i }));
    expect(disconnect).toHaveBeenCalledWith("c1", expect.anything());
  });

  it("confirms a disconnect with a toast when it succeeds", async () => {
    data = { connected: [conn({})], catalog };
    disconnect.mockImplementation((_id, opts) => opts.onSuccess());
    renderWithQuery(<ChannelsSettingsPage />);
    await userEvent.click(screen.getByRole("button", { name: /disconnect/i }));
    expect(toast.success).toHaveBeenCalledWith("Telegram disconnected");
  });

  it("treats a disconnected channel as not connected, and offers to reconnect with its old settings", () => {
    data = { connected: [conn({ id: "old", status: "DISCONNECTED" })], catalog };
    renderWithQuery(<ChannelsSettingsPage />);
    expect(screen.queryByText("support_bot")).not.toBeInTheDocument();
    expect(screen.getByTestId("dialog-TELEGRAM")).toHaveAttribute("data-prefill", "old");
  });

  it("shows why a channel is in an error state (e.g. a mailbox password that stopped working)", () => {
    data = {
      connected: [conn({ id: "e1", type: "EMAIL", status: "ERROR", externalAccountName: "support@acme.com", lastErrorMessage: "IMAP sign-in was rejected. Check the password." })],
      catalog,
    };
    renderWithQuery(<ChannelsSettingsPage />);
    expect(screen.getByText("ERROR")).toBeInTheDocument();
    expect(screen.getByText("IMAP sign-in was rejected. Check the password.")).toBeInTheDocument();
    // email can be edited in place, so the admin can fix the credentials
    expect(screen.getByTestId("dialog-EMAIL")).toHaveAttribute("data-editing", "e1");
    expect(screen.getByRole("button", { name: /settings/i })).toBeInTheDocument();
  });

  it("gives Live chat an embed snippet that can be copied", async () => {
    data = { connected: [conn({ id: "lc", type: "LIVE_CHAT", externalAccountId: "wk_abc123", externalAccountName: "Demo Support" })], catalog };
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderWithQuery(<ChannelsSettingsPage />);

    const snippet = screen.getByText(/widget\.js/);
    expect(snippet).toHaveTextContent('data-key="wk_abc123"');
    await userEvent.click(screen.getByRole("button", { name: "Copy embed snippet" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('data-key="wk_abc123"'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Snippet copied"));
  });

  it("only shows the embed snippet for live chat, not other channels", () => {
    data = { connected: [conn({})], catalog };
    renderWithQuery(<ChannelsSettingsPage />);
    expect(screen.queryByText(/widget\.js/)).not.toBeInTheDocument();
    expect(within(document.body).queryByRole("button", { name: "Copy embed snippet" })).not.toBeInTheDocument();
  });
});
