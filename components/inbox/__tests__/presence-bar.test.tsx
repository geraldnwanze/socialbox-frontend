import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PresenceBar, ViewerBadges } from "@/components/inbox/presence-bar";
import { applyPresence, type Viewer } from "@/lib/presence-store";

vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "me", fullName: "Me Myself" } }) }));

const viewer = (userId: string, name: string, over: Partial<Viewer> = {}): Viewer => ({
  userId,
  name,
  typing: false,
  until: Date.now() + 30_000,
  typingUntil: 0,
  ...over,
});

describe("collision detection UI", () => {
  afterEach(() => {
    act(() => applyPresence("c1", []));
    vi.useRealTimers();
  });

  it("shows nothing when nobody else is here (you never see yourself)", () => {
    render(<PresenceBar conversationId="c1" />);
    act(() => applyPresence("c1", [viewer("me", "Me Myself")]));
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says who else is viewing", () => {
    render(<PresenceBar conversationId="c1" />);
    act(() => applyPresence("c1", [viewer("a", "Ann Lee")]));
    expect(screen.getByRole("status")).toHaveTextContent("Ann Lee is also viewing this conversation");
    act(() => applyPresence("c1", [viewer("a", "Ann Lee"), viewer("b", "Bob Stone")]));
    expect(screen.getByRole("status")).toHaveTextContent("Ann Lee and Bob Stone are also viewing this conversation");
  });

  it("warns loudly when a teammate is typing a reply", () => {
    render(<PresenceBar conversationId="c1" />);
    act(() => applyPresence("c1", [viewer("a", "Ann Lee", { typing: true, typingUntil: Date.now() + 6000 }), viewer("b", "Bob Stone")]));
    expect(screen.getByRole("status")).toHaveTextContent("Ann Lee is typing a reply — check before you send yours");
  });

  it("lets a typing warning relax to 'viewing', and a departed viewer vanish, without any new event", () => {
    vi.useFakeTimers();
    render(<PresenceBar conversationId="c1" />);
    act(() =>
      applyPresence("c1", [viewer("a", "Ann Lee", { typing: true, typingUntil: Date.now() + 6000, until: Date.now() + 30_000 })]),
    );
    expect(screen.getByRole("status")).toHaveTextContent("typing a reply");

    act(() => vi.advanceTimersByTime(7000));
    expect(screen.getByRole("status")).toHaveTextContent("is also viewing");

    act(() => vi.advanceTimersByTime(30_000)); // their pings stopped (closed tab)
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("badges in the conversation list show initials of others only", () => {
    render(<ViewerBadges conversationId="c1" />);
    act(() => applyPresence("c1", [viewer("me", "Me Myself"), viewer("a", "Ann Lee")]));
    expect(screen.getByText("AL")).toBeInTheDocument();
    expect(screen.queryByText("MM")).not.toBeInTheDocument();
  });
});
