import { describe, expect, it, vi } from "vitest";
import { applyPresence, getViewers, subscribePresence, type Viewer } from "@/lib/presence-store";
import { emitTyping, onTyping } from "@/lib/typing-events";
import { identityLabel } from "@/lib/channel-meta";

const viewer = (userId: string): Viewer => ({ userId, name: userId, typing: false, until: Date.now() + 1000, typingUntil: 0 });

describe("presence store", () => {
  it("replaces a conversation's viewers with each snapshot and notifies subscribers", () => {
    const listener = vi.fn();
    const stop = subscribePresence(listener);
    applyPresence("c1", [viewer("a"), viewer("b")]);
    expect(getViewers("c1").map((v) => v.userId)).toEqual(["a", "b"]);
    applyPresence("c1", [viewer("b")]);
    expect(getViewers("c1").map((v) => v.userId)).toEqual(["b"]);
    expect(listener).toHaveBeenCalledTimes(2);
    stop();
    applyPresence("c1", []);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("returns a stable empty list (so React doesn't re-render forever) for unknown conversations", () => {
    expect(getViewers("nobody")).toBe(getViewers("also-nobody"));
    applyPresence("c2", [viewer("a")]);
    applyPresence("c2", []);
    expect(getViewers("c2")).toBe(getViewers("nobody"));
  });
});

describe("typing events", () => {
  it("delivers to subscribers until they unsubscribe", () => {
    const listener = vi.fn();
    const stop = onTyping(listener);
    emitTyping("c1");
    stop();
    emitTyping("c2");
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("c1");
  });
});

describe("identityLabel", () => {
  it("shows an email address plainly and other handles with @", () => {
    expect(identityLabel({ channel: "EMAIL", username: "ann@x.com", externalUserId: "ann@x.com" })).toBe("ann@x.com");
    expect(identityLabel({ channel: "TELEGRAM", username: "ann", externalUserId: "1" })).toBe("@ann");
    expect(identityLabel({ channel: "WHATSAPP", externalUserId: "+234" })).toBe("+234");
  });
});
