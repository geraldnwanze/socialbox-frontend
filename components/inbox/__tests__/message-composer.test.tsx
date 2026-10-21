import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { MessageComposer } from "@/components/inbox/message-composer";
import type { CannedResponse } from "@/lib/types";

const sendMutateAsync = vi.fn();
const suggestMutate = vi.fn();
const rewriteMutate = vi.fn();
const post = vi.fn();
const toast = { error: vi.fn(), success: vi.fn() };
let aiAvailable = false;

vi.mock("@/hooks/use-messages", () => ({
  useSendMessage: () => ({ mutateAsync: sendMutateAsync, isPending: false }),
  useRequestUploadUrl: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/hooks/use-canned-responses", () => ({ useCannedResponses: () => ({ data: replies }) }));
vi.mock("@/hooks/use-ai", () => ({
  useAiAvailable: () => aiAvailable,
  useSuggestReply: () => ({ mutate: suggestMutate, isPending: false }),
  useRewrite: () => ({ mutate: rewriteMutate, isPending: false }),
}));
vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "me", fullName: "Bob Stone" } }) }));
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { post: (...a: unknown[]) => post(...a) } }));
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toast.error(...a), success: (...a: unknown[]) => toast.success(...a) } }));

const reply = (id: string, shortcut: string, title: string, content: string): CannedResponse => ({
  id, workspaceId: "w", shortcut, title, content, createdAt: "", updatedAt: "",
});
const replies = [
  reply("r1", "shipping", "Shipping times", "Hi {{customer_name}}, we ship in 2-3 days. - {{agent_name}}"),
  reply("r2", "refund", "Refund policy", "Refunds take 5 days."),
];

function setup(props: Partial<React.ComponentProps<typeof MessageComposer>> = {}) {
  renderWithQuery(<MessageComposer conversationId="c1" status="OPEN" customerName="Ann Lee" {...props} />);
  // Absent on a resolved conversation, where the composer is replaced by a notice.
  return screen.queryByPlaceholderText("Type a message...") as HTMLTextAreaElement;
}

describe("MessageComposer", () => {
  beforeEach(() => {
    aiAvailable = false;
    sendMutateAsync.mockResolvedValue({});
    post.mockResolvedValue({});
  });

  describe("sending", () => {
    it("sends on Enter, trimmed, and clears the box", async () => {
      const box = setup();
      await userEvent.type(box, "  Hello there  {Enter}");
      await waitFor(() => expect(sendMutateAsync).toHaveBeenCalledWith({ conversationId: "c1", type: "TEXT", text: "Hello there" }));
      await waitFor(() => expect(box).toHaveValue(""));
    });

    it("Shift+Enter adds a new line instead of sending", async () => {
      const box = setup();
      await userEvent.type(box, "line one{Shift>}{Enter}{/Shift}line two");
      expect(box).toHaveValue("line one\nline two");
      expect(sendMutateAsync).not.toHaveBeenCalled();
    });

    it("never sends an empty or whitespace-only message", async () => {
      const box = setup();
      await userEvent.type(box, "   {Enter}");
      expect(sendMutateAsync).not.toHaveBeenCalled();
    });

    it("keeps the draft and says so when sending fails", async () => {
      sendMutateAsync.mockRejectedValue(new Error("nope"));
      const box = setup();
      await userEvent.type(box, "Important{Enter}");
      await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/unable to send/i)));
      expect(box).toHaveValue("Important");
    });

    it("replaces the composer with a notice on a resolved conversation", () => {
      setup({ status: "RESOLVED" });
      expect(screen.queryByPlaceholderText("Type a message...")).not.toBeInTheDocument();
      expect(screen.getByText(/resolved\. reopen it/i)).toBeInTheDocument();
    });
  });

  describe("saved replies (/ picker)", () => {
    it("opens when you type /, and narrows as you type", async () => {
      const box = setup();
      await userEvent.type(box, "/");
      expect(screen.getByRole("listbox", { name: "Saved replies" })).toBeInTheDocument();
      expect(screen.getAllByRole("option")).toHaveLength(2);

      await userEvent.type(box, "ship");
      const options = screen.getAllByRole("option");
      expect(options).toHaveLength(1);
      expect(options[0]).toHaveTextContent("Shipping times");
    });

    it("matches by title as well as shortcut", async () => {
      const box = setup();
      await userEvent.type(box, "/refund");
      expect(screen.getAllByRole("option")[0]).toHaveTextContent("Refund policy");
    });

    it("Enter inserts the reply with the customer's and the agent's first names — and does NOT send it", async () => {
      const box = setup();
      await userEvent.type(box, "/ship{Enter}");
      expect(box).toHaveValue("Hi Ann, we ship in 2-3 days. - Bob");
      expect(sendMutateAsync).not.toHaveBeenCalled();
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("arrow keys move the highlight, and Tab picks too", async () => {
      const box = setup();
      await userEvent.type(box, "/");
      const options = screen.getAllByRole("option");
      expect(options[0]).toHaveAttribute("aria-selected", "true");
      await userEvent.keyboard("{ArrowDown}");
      expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
      await userEvent.keyboard("{Tab}");
      expect(box).toHaveValue("Refunds take 5 days.");
    });

    it("Escape closes the picker and leaves the typed text alone", async () => {
      const box = setup();
      await userEvent.type(box, "/sh");
      await userEvent.keyboard("{Escape}");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
      expect(box).toHaveValue("/sh");
    });

    it("a slash in the middle of a sentence is just a slash", async () => {
      const box = setup();
      await userEvent.type(box, "see https://x.com/ship");
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    });

    it("can be opened with the button, and picked with the mouse", async () => {
      const box = setup();
      await userEvent.click(screen.getByRole("button", { name: "Saved replies" }));
      await userEvent.click(screen.getByRole("option", { name: /Refund policy/ }));
      expect(box).toHaveValue("Refunds take 5 days.");
    });

    it("says so when nothing matches, and Enter then does not send", async () => {
      const box = setup();
      await userEvent.type(box, "/zzz");
      expect(screen.getByText("No matching replies")).toBeInTheDocument();
      await userEvent.keyboard("{Enter}");
      expect(sendMutateAsync).not.toHaveBeenCalled();
      expect(box).toHaveValue("/zzz");
    });
  });

  describe("typing signal", () => {
    it("pings presence (typing) while an agent writes, but not for slash commands, and not on every key", async () => {
      const box = setup();
      await userEvent.type(box, "Hello wor");
      const typingCalls = post.mock.calls.filter(([path, body]) => path === "/conversations/c1/presence" && body?.typing === true);
      expect(typingCalls).toHaveLength(1); // throttled to one per few seconds

      post.mockClear();
      const other = document.createElement("div");
      document.body.append(other);
      await userEvent.clear(box);
      await userEvent.type(box, "/sh");
      expect(post).not.toHaveBeenCalled();
    });
  });

  describe("AI assist", () => {
    it("is invisible unless the server has a key and the workspace opted in", () => {
      aiAvailable = false;
      setup();
      expect(screen.queryByRole("button", { name: "AI assist" })).not.toBeInTheDocument();
    });

    it("shows a suggested reply as a preview that is not sent or inserted until accepted", async () => {
      aiAvailable = true;
      suggestMutate.mockImplementation((_vars, opts) => opts.onSuccess({ text: "Hi Ann, it ships today." }));
      const box = setup();
      await userEvent.click(screen.getByRole("button", { name: "AI assist" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: /suggest a reply/i }));

      expect(await screen.findByText("Hi Ann, it ships today.")).toBeInTheDocument();
      expect(screen.getByText(/check it before you send/i)).toBeInTheDocument();
      expect(box).toHaveValue("");
      expect(sendMutateAsync).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Use this reply" }));
      expect(box).toHaveValue("Hi Ann, it ships today.");
      expect(sendMutateAsync).not.toHaveBeenCalled(); // the agent still has to press send
    });

    it("uses what the agent already typed as guidance for the suggestion", async () => {
      aiAvailable = true;
      const box = setup();
      await userEvent.type(box, "offer a refund");
      await userEvent.click(screen.getByRole("button", { name: "AI assist" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: /suggest a reply/i }));
      expect(suggestMutate).toHaveBeenCalledWith({ conversationId: "c1", instruction: "offer a refund" }, expect.anything());
    });

    it("lets the agent dismiss a suggestion", async () => {
      aiAvailable = true;
      suggestMutate.mockImplementation((_v, opts) => opts.onSuccess({ text: "Draft" }));
      setup();
      await userEvent.click(screen.getByRole("button", { name: "AI assist" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: /suggest a reply/i }));
      await userEvent.click(await screen.findByRole("button", { name: "Dismiss" }));
      expect(screen.queryByText("Draft")).not.toBeInTheDocument();
    });

    it("rewrites the draft in the chosen tone, and Undo brings the original back", async () => {
      aiAvailable = true;
      rewriteMutate.mockImplementation((_v, opts) => opts.onSuccess({ text: "Dear Ann, your order has shipped." }));
      const box = setup();
      await userEvent.type(box, "yo ur order shipped");

      await userEvent.click(screen.getByRole("button", { name: "AI assist" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: "More formal" }));

      expect(rewriteMutate).toHaveBeenCalledWith({ text: "yo ur order shipped", tone: "more_formal" }, expect.anything());
      expect(box).toHaveValue("Dear Ann, your order has shipped.");

      await userEvent.click(screen.getByRole("button", { name: "Undo AI change" }));
      expect(box).toHaveValue("yo ur order shipped");
      expect(screen.queryByRole("button", { name: "Undo AI change" })).not.toBeInTheDocument();
    });

    it("cannot rewrite an empty draft", async () => {
      aiAvailable = true;
      setup();
      await userEvent.click(screen.getByRole("button", { name: "AI assist" }));
      expect(await screen.findByRole("menuitem", { name: "Shorter" })).toHaveAttribute("aria-disabled", "true");
    });

    it("shows the server's explanation when AI can't help, instead of failing silently", async () => {
      aiAvailable = true;
      const { ApiError } = await import("@/lib/api-client");
      suggestMutate.mockImplementation((_v, opts) => opts.onError(new ApiError(422, "AI_DECLINED", "The AI declined to work on this conversation")));
      setup();
      await userEvent.click(screen.getByRole("button", { name: "AI assist" }));
      await userEvent.click(await screen.findByRole("menuitem", { name: /suggest a reply/i }));
      expect(toast.error).toHaveBeenCalledWith("The AI declined to work on this conversation");
    });
  });
});
