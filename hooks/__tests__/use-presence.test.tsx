import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { usePresenceHeartbeat, useOtherViewers } from "@/hooks/use-presence";
import { applyPresence, getViewers } from "@/lib/presence-store";

const post = vi.fn();
const del = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { post: (...a: unknown[]) => post(...a), delete: (...a: unknown[]) => del(...a) } }));
vi.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ user: { id: "me" } }) }));

const setHidden = (hidden: boolean) => Object.defineProperty(document, "hidden", { value: hidden, configurable: true });

describe("usePresenceHeartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    post.mockResolvedValue({ viewers: [] });
    del.mockResolvedValue(undefined);
    setHidden(false);
  });
  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
    act(() => applyPresence("c1", []));
  });

  it("announces presence immediately and then every 15 seconds", async () => {
    renderHook(() => usePresenceHeartbeat("c1"));
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith("/conversations/c1/presence", {});
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(post).toHaveBeenCalledTimes(2);
    await act(() => vi.advanceTimersByTimeAsync(30_000));
    expect(post).toHaveBeenCalledTimes(4);
  });

  it("does not announce presence from a background tab, and does again when it comes back", async () => {
    setHidden(true);
    renderHook(() => usePresenceHeartbeat("c1"));
    await act(() => vi.advanceTimersByTimeAsync(45_000));
    expect(post).not.toHaveBeenCalled();

    setHidden(false);
    act(() => void document.dispatchEvent(new Event("visibilitychange")));
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("seeds the store from the response, so it works even if a realtime event was missed", async () => {
    const viewers = [{ userId: "a", name: "Ann Lee", typing: false, until: Date.now() + 30_000, typingUntil: 0 }];
    post.mockResolvedValue({ viewers });
    renderHook(() => usePresenceHeartbeat("c1"));
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(getViewers("c1")).toEqual(viewers);
  });

  it("says goodbye when you leave the conversation, and stops pinging", async () => {
    const { unmount } = renderHook(() => usePresenceHeartbeat("c1"));
    unmount();
    expect(del).toHaveBeenCalledWith("/conversations/c1/presence");
    post.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(post).not.toHaveBeenCalled();
  });

  it("switches over cleanly when you move to another conversation", () => {
    const { rerender } = renderHook(({ id }) => usePresenceHeartbeat(id), { initialProps: { id: "c1" } });
    rerender({ id: "c2" });
    expect(del).toHaveBeenCalledWith("/conversations/c1/presence");
    expect(post).toHaveBeenLastCalledWith("/conversations/c2/presence", {});
  });

  it("survives network errors without throwing", async () => {
    post.mockRejectedValue(new Error("offline"));
    del.mockRejectedValue(new Error("offline"));
    const { unmount } = renderHook(() => usePresenceHeartbeat("c1"));
    await act(() => vi.advanceTimersByTimeAsync(15_000));
    expect(() => unmount()).not.toThrow();
  });
});

describe("useOtherViewers", () => {
  afterEach(() => {
    vi.useRealTimers();
    act(() => applyPresence("c1", []));
  });

  it("excludes you and anyone whose time is up", () => {
    vi.useFakeTimers();
    const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;
    const { result } = renderHook(() => useOtherViewers("c1"), { wrapper });
    act(() =>
      applyPresence("c1", [
        { userId: "me", name: "Me", typing: false, until: Date.now() + 30_000, typingUntil: 0 },
        { userId: "a", name: "Ann", typing: false, until: Date.now() + 5_000, typingUntil: 0 },
      ]),
    );
    expect(result.current.map((v) => v.userId)).toEqual(["a"]);
    act(() => vi.advanceTimersByTime(6_000));
    expect(result.current).toEqual([]);
  });
});
