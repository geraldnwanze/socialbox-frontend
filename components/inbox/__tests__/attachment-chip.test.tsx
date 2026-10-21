import { describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { render } from "@testing-library/react";
import { AttachmentChip } from "@/components/inbox/attachment-chip";
import type { MessageAttachment } from "@/lib/types";

const get = vi.fn();
const toastError = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { get: (...a: unknown[]) => get(...a) } }));
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toastError(...a) } }));

const attachment = (over: Partial<MessageAttachment> = {}): MessageAttachment => ({
  id: "a1",
  messageId: "m1",
  fileName: "invoice.pdf",
  fileSize: 2048,
  storageKey: "workspaces/w/1.pdf",
  ...over,
});

describe("AttachmentChip", () => {
  it("shows the file name and a readable size", () => {
    render(<AttachmentChip attachment={attachment()} outbound={false} />);
    expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByText("2 KB")).toBeInTheDocument();
  });

  it("fetches a fresh signed link on click and opens it without leaking the opener", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    get.mockResolvedValue({ url: "https://storage.example/signed" });
    render(<AttachmentChip attachment={attachment()} outbound />);

    await userEvent.click(screen.getByRole("button"));

    await waitFor(() => expect(open).toHaveBeenCalledWith("https://storage.example/signed", "_blank", "noopener,noreferrer"));
    expect(get).toHaveBeenCalledWith("/attachments/a1/download-url");
  });

  it("falls back to the provider URL for media not yet mirrored", async () => {
    const open = vi.spyOn(window, "open").mockReturnValue(null);
    render(<AttachmentChip attachment={attachment({ storageKey: undefined, sourceUrl: "https://cdn.example/x.png" })} outbound={false} />);
    await userEvent.click(screen.getByRole("button"));
    expect(open).toHaveBeenCalledWith("https://cdn.example/x.png", "_blank", "noopener,noreferrer");
    expect(get).not.toHaveBeenCalled();
  });

  it("tells the agent when the file isn't available yet, and when opening fails", async () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    const { unmount } = render(<AttachmentChip attachment={attachment({ storageKey: undefined, sourceUrl: undefined })} outbound={false} />);
    await userEvent.click(screen.getByRole("button"));
    expect(toastError).toHaveBeenCalledWith(expect.stringMatching(/isn't available yet/));
    unmount();

    get.mockRejectedValue(new Error("boom"));
    render(<AttachmentChip attachment={attachment()} outbound={false} />);
    await userEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Unable to open this file"));
  });
});
