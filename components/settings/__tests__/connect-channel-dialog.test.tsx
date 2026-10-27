import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { ConnectChannelDialog } from "@/components/settings/connect-channel-dialog";
import { ApiError } from "@/lib/api-client";
import type { ChannelConnection } from "@/lib/types";

const connect = vi.fn();
const reconnect = vi.fn();
vi.mock("@/hooks/use-channels", () => ({
  useConnectChannel: () => ({ mutateAsync: connect, isPending: false }),
  useReconnectChannel: () => ({ mutateAsync: reconnect, isPending: false }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

const open = async (ui: React.ReactElement) => {
  renderWithQuery(ui);
  await userEvent.click(screen.getByRole("button", { name: "Open" }));
};
const trigger = <button>Open</button>;

describe("ConnectChannelDialog", () => {
  beforeEach(() => {
    // (braces matter: a function returned from beforeEach would be run as a teardown hook)
    connect.mockResolvedValue({});
  });

  describe("Email", () => {
    it("starts with sensible server defaults and hides the password", async () => {
      await open(<ConnectChannelDialog type="EMAIL" trigger={trigger} />);
      expect(await screen.findByLabelText("IMAP port")).toHaveValue("993");
      expect(screen.getByLabelText("IMAP security")).toHaveValue("SSL");
      expect(screen.getByLabelText("SMTP port")).toHaveValue("587");
      expect(screen.getByLabelText("SMTP security")).toHaveValue("STARTTLS");
      expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
      expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    });

    it("sends every field the server needs", async () => {
      await open(<ConnectChannelDialog type="EMAIL" trigger={trigger} />);
      await userEvent.type(await screen.findByLabelText("Email address"), "support@acme.com");
      await userEvent.type(screen.getByLabelText("Password"), "app-password");
      await userEvent.type(screen.getByLabelText("IMAP server (incoming)"), "imap.acme.com");
      await userEvent.type(screen.getByLabelText("SMTP server (outgoing)"), "smtp.acme.com");
      await userEvent.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() =>
        expect(connect).toHaveBeenCalledWith({
          type: "EMAIL",
          credentials: expect.objectContaining({
            email: "support@acme.com",
            password: "app-password",
            imapHost: "imap.acme.com",
            imapPort: "993",
            imapSecurity: "SSL",
            smtpHost: "smtp.acme.com",
            smtpPort: "587",
            smtpSecurity: "STARTTLS",
          }),
        }),
      );
    });

    it("requires the essentials but not the optional sender name or username", async () => {
      await open(<ConnectChannelDialog type="EMAIL" trigger={trigger} />);
      expect(await screen.findByLabelText("Email address")).toBeRequired();
      expect(screen.getByLabelText("Password")).toBeRequired();
      expect(screen.getByLabelText("Sender name")).not.toBeRequired();
      expect(screen.getByLabelText("Username")).not.toBeRequired();
    });

    it("shows the server's explanation when the mailbox can't be reached", async () => {
      connect.mockImplementation(async () => {
        throw new ApiError(400, "EMAIL_CONNECTION_FAILED", "IMAP sign-in was rejected. Check the username and password.");
      });
      await open(<ConnectChannelDialog type="EMAIL" trigger={trigger} />);
      await userEvent.type(await screen.findByLabelText("Email address"), "a@b.co");
      await userEvent.type(screen.getByLabelText("Password"), "x");
      await userEvent.type(screen.getByLabelText("IMAP server (incoming)"), "imap.b.co");
      await userEvent.type(screen.getByLabelText("SMTP server (outgoing)"), "smtp.b.co");
      await userEvent.click(screen.getByRole("button", { name: "Connect" }));
      expect(await screen.findByText(/sign-in was rejected/i)).toBeInTheDocument();
    });

    it("prefills only the visible parts when editing (secrets are never sent back to the browser)", async () => {
      const connection = { id: "c1", metadata: { email: "support@acme.com", imapHost: "imap.acme.com", smtpHost: "smtp.acme.com" } } as unknown as ChannelConnection;
      await open(<ConnectChannelDialog type="EMAIL" connection={connection} trigger={trigger} />);
      expect(await screen.findByLabelText("Email address")).toHaveValue("support@acme.com");
      expect(screen.getByLabelText("IMAP server (incoming)")).toHaveValue("imap.acme.com");
      expect(screen.getByLabelText("Password")).toHaveValue("");
    });
  });

  describe("Live chat", () => {
    it("only shows the opening-hours fields once hours are switched on", async () => {
      await open(<ConnectChannelDialog type="LIVE_CHAT" trigger={trigger} />);
      await screen.findByLabelText("Widget title");
      expect(screen.queryByLabelText("Time zone")).not.toBeInTheDocument();
      expect(screen.queryByText("Open on")).not.toBeInTheDocument();

      await userEvent.click(screen.getByLabelText(/show as offline outside opening hours/i));
      expect(screen.getByLabelText("Time zone")).toBeInTheDocument();
      expect(screen.getByText("Open on")).toBeInTheDocument();
      expect(screen.getByLabelText("Opens at")).toHaveValue("09:00");
      expect(screen.getByLabelText("Closes at")).toHaveValue("17:00");
    });

    it("toggles open days and sends the chosen settings as strings", async () => {
      await open(<ConnectChannelDialog type="LIVE_CHAT" trigger={trigger} />);
      await userEvent.click(await screen.findByLabelText(/ask for the visitor's name/i));
      await userEvent.click(screen.getByLabelText(/show as offline outside opening hours/i));
      const sat = screen.getByRole("button", { name: "Sat" });
      expect(sat).toHaveAttribute("aria-pressed", "false");
      await userEvent.click(sat);
      expect(sat).toHaveAttribute("aria-pressed", "true");
      await userEvent.click(screen.getByRole("button", { name: "Mon" })); // switch Monday off
      await userEvent.click(screen.getByRole("button", { name: "Connect" }));

      await waitFor(() => expect(connect).toHaveBeenCalled());
      const { credentials } = connect.mock.calls[0][0];
      expect(credentials).toMatchObject({ askName: "true", hoursEnabled: "true", hoursDays: "2,3,4,5,6", hoursStart: "09:00", hoursEnd: "17:00" });
    });

    it("loads saved settings when editing, including the opening hours", async () => {
      const connection = {
        id: "c1",
        metadata: {
          title: "Support", greeting: "Hi", color: "#4F46E5", allowedOrigins: ["https://a.com"], askName: true,
          hours: { enabled: true, timezone: "Europe/London", days: [1, 2], start: "08:30", end: "18:00" },
        },
      } as unknown as ChannelConnection;
      await open(<ConnectChannelDialog type="LIVE_CHAT" connection={connection} trigger={trigger} />);
      expect(await screen.findByLabelText("Widget title")).toHaveValue("Support");
      expect(screen.getByLabelText(/ask for the visitor's name/i)).toBeChecked();
      expect(screen.queryByLabelText(/ask for the visitor's email/i)).not.toBeInTheDocument();
      expect(screen.getByLabelText("Time zone")).toHaveValue("Europe/London");
      expect(screen.getByLabelText("Opens at")).toHaveValue("08:30");
      expect(screen.getByRole("button", { name: "Tue" })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("button", { name: "Sun" })).toHaveAttribute("aria-pressed", "false");

      await userEvent.click(screen.getByRole("button", { name: "Save" }));
      await waitFor(() => expect(reconnect).toHaveBeenCalledWith(expect.objectContaining({ id: "c1" })));
    });
  });
});
