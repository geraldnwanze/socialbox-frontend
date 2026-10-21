import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createClient } from "@/test-utils/render";
import { useRealtime } from "@/hooks/use-realtime";
import { getViewers } from "@/lib/presence-store";
import { onTyping } from "@/lib/typing-events";

type Handler = (payload?: unknown) => void;
const handlers = new Map<string, Handler>();
const disconnect = vi.fn();
const playSound = vi.fn();
// vi.mock factories are hoisted above the imports, so anything they reference must be hoisted too.
const toast = vi.hoisted(() => Object.assign(vi.fn(), { info: vi.fn() }));

vi.mock("@/lib/socket", () => ({
  createSocket: vi.fn(() => ({ on: (event: string, h: Handler) => void handlers.set(event, h), disconnect })),
}));
vi.mock("@/lib/notification-sound", () => ({
  playMessageSound: (...a: unknown[]) => playSound(...a),
  unlockAudioOnFirstInteraction: () => () => undefined,
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/providers/workspace-provider", () => ({ useWorkspace: () => ({ activeWorkspace: { id: "w1" } }) }));

const emit = (event: string, payload?: unknown) => handlers.get(event)?.(payload);

function setup() {
  const client = createClient();
  const spy = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const hook = renderHook(() => useRealtime(), { wrapper });
  return { spy, ...hook };
}
const invalidated = (spy: ReturnType<typeof setup>["spy"]) => spy.mock.calls.map(([f]) => JSON.stringify((f as { queryKey: unknown }).queryKey));

describe("useRealtime", () => {
  beforeEach(() => {
    handlers.clear();
    playSound.mockResolvedValue("played");
  });

  it("refetches the list and the open conversation on updates, instead of trusting the payload", () => {
    const { spy } = setup();
    emit("conversation.updated", { id: "c1" });
    expect(invalidated(spy)).toEqual(expect.arrayContaining(['["conversations"]', '["conversation","c1"]']));
  });

  it("refetches the messages of a conversation when one arrives, and chimes for customer messages only", () => {
    const { spy } = setup();
    emit("message.created", { conversationId: "c1", direction: "INBOUND" });
    expect(invalidated(spy)).toContain('["messages","c1"]');
    expect(playSound).toHaveBeenCalledTimes(1);

    emit("message.created", { conversationId: "c1", direction: "OUTBOUND" });
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it("explains how to enable sound when the browser blocked it", async () => {
    playSound.mockResolvedValue("blocked");
    setup();
    emit("message.created", { conversationId: "c1", direction: "INBOUND" });
    await vi.waitFor(() => expect(toast.info).toHaveBeenCalledWith(expect.stringMatching(/click anywhere/i), expect.anything()));
  });

  it("refreshes message ticks on status changes", () => {
    const { spy } = setup();
    emit("message.status_changed", { conversationId: "c9" });
    expect(invalidated(spy)).toContain('["messages","c9"]');
  });

  it("refreshes an open timeline when activity happens", () => {
    const { spy } = setup();
    emit("conversation.activity", { conversationId: "c3" });
    expect(invalidated(spy)).toContain('["conversation-events","c3"]');
  });

  it("feeds typing and presence events to the screens that show them", () => {
    setup();
    const typing = vi.fn();
    onTyping(typing);
    emit("conversation.typing", { conversationId: "c1" });
    expect(typing).toHaveBeenCalledWith("c1");

    const viewers = [{ userId: "a", name: "Ann", typing: false, until: Date.now() + 1000, typingUntil: 0 }];
    emit("conversation.presence", { conversationId: "c7", viewers });
    expect(getViewers("c7")).toEqual(viewers);
  });

  it("re-fetches what's on screen after reconnecting, since events sent while offline are gone", () => {
    const { spy } = setup();
    emit("connect");
    expect(invalidated(spy)).toEqual(expect.arrayContaining(['["conversations"]', '["conversation"]', '["messages"]']));
  });

  it("toasts when a conversation is assigned to you", () => {
    const { spy } = setup();
    emit("notification.created", { type: "CONVERSATION_ASSIGNED" });
    expect(toast).toHaveBeenCalledWith("A conversation was assigned to you");
    expect(invalidated(spy)).toContain('["notifications"]');
  });

  it("disconnects when the screen goes away", () => {
    const { unmount } = setup();
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });
});
