import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithQuery } from "@/test-utils/render";
import { AiSummaryCard } from "@/components/inbox/ai-summary-card";

const summaryMutate = vi.fn();
const toast = { error: vi.fn() };
let available = true;
let data: unknown;

vi.mock("@/hooks/use-ai", () => ({
  useAiAvailable: () => available,
  useAiSummary: () => ({ mutate: summaryMutate, isPending: false, data }),
}));
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => toast.error(...a) } }));

describe("AiSummaryCard", () => {
  beforeEach(() => {
    available = true;
    data = undefined;
  });

  it("renders nothing at all when AI assist is not available", () => {
    available = false;
    const { container } = renderWithQuery(<AiSummaryCard conversationId="c1" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers to summarize on demand — it never calls the model by itself", () => {
    renderWithQuery(<AiSummaryCard conversationId="c1" />);
    expect(summaryMutate).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /summarize this conversation/i })).toBeInTheDocument();
  });

  it("asks for a summary of this conversation when clicked", async () => {
    renderWithQuery(<AiSummaryCard conversationId="c9" />);
    await userEvent.click(screen.getByRole("button", { name: /summarize this conversation/i }));
    expect(summaryMutate).toHaveBeenCalledWith("c9", expect.anything());
  });

  it("shows the summary, mood, intent, whether a reply is needed, and labels it as AI-generated", () => {
    data = { summary: "Wants a refund for order 42.", sentiment: "NEGATIVE", intent: "Refund request", needsReply: true, nextStep: "Check the order", cached: false };
    renderWithQuery(<AiSummaryCard conversationId="c1" />);
    expect(screen.getByText("Wants a refund for order 42.")).toBeInTheDocument();
    expect(screen.getByText("Negative")).toBeInTheDocument();
    expect(screen.getByText("Refund request")).toBeInTheDocument();
    expect(screen.getByText("Needs a reply")).toBeInTheDocument();
    expect(screen.getByText(/Check the order/)).toBeInTheDocument();
    expect(screen.getByText(/AI-generated/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /summarize this conversation/i })).not.toBeInTheDocument();
  });

  it("omits 'needs a reply' when the customer was answered, and can summarize again", async () => {
    data = { summary: "All sorted.", sentiment: "POSITIVE", intent: "Thanks", needsReply: false, nextStep: "", cached: true };
    renderWithQuery(<AiSummaryCard conversationId="c1" />);
    expect(screen.queryByText("Needs a reply")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Summarize again" }));
    expect(summaryMutate).toHaveBeenCalled();
  });

  it("shows the server's reason when a summary can't be made", async () => {
    const { ApiError } = await import("@/lib/api-client");
    summaryMutate.mockImplementation((_id, opts) => opts.onError(new ApiError(422, "AI_DECLINED", "The AI declined to work on this conversation")));
    renderWithQuery(<AiSummaryCard conversationId="c1" />);
    await userEvent.click(screen.getByRole("button", { name: /summarize this conversation/i }));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("The AI declined to work on this conversation"));
  });
});
