import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { TypingIndicator } from "@/components/inbox/typing-indicator";
import { emitTyping } from "@/lib/typing-events";

describe("TypingIndicator", () => {
  afterEach(() => vi.useRealTimers());

  it("is hidden until the customer types, then names them", () => {
    render(<TypingIndicator conversationId="c1" name="Ann" />);
    expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
    act(() => emitTyping("c1"));
    expect(screen.getByText("Ann is typing…")).toBeInTheDocument();
  });

  it("says 'The customer' when there is no usable name", () => {
    render(<TypingIndicator conversationId="c1" name={null} />);
    act(() => emitTyping("c1"));
    expect(screen.getByText("The customer is typing…")).toBeInTheDocument();
  });

  it("ignores typing in other conversations", () => {
    render(<TypingIndicator conversationId="c1" name="Ann" />);
    act(() => emitTyping("someone-else"));
    expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
  });

  it("goes away on its own a few seconds after the last keystroke, and stays while they keep typing", () => {
    vi.useFakeTimers();
    render(<TypingIndicator conversationId="c1" name="Ann" />);
    act(() => emitTyping("c1"));
    act(() => vi.advanceTimersByTime(3000));
    act(() => emitTyping("c1")); // still typing: the clock restarts
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("Ann is typing…")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.queryByText(/typing/)).not.toBeInTheDocument();
  });
});
