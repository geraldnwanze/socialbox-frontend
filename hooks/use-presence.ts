"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { api } from "@/lib/api-client";
import { applyPresence, getViewers, subscribePresence, type Viewer } from "@/lib/presence-store";
import { useAuth } from "@/providers/auth-provider";

const HEARTBEAT_MS = 15_000;

/** While a conversation is open and visible, tell the team we're here (collision detection). */
export function usePresenceHeartbeat(conversationId: string) {
  useEffect(() => {
    const ping = () => {
      if (document.hidden) return;
      api
        .post<{ viewers: Viewer[] }>(`/conversations/${conversationId}/presence`, {})
        // The response is the current snapshot: seeds the store even if a realtime event was missed
        // (e.g. the socket was still connecting when this page opened).
        .then((res) => applyPresence(conversationId, res.viewers))
        .catch(() => undefined);
    };
    ping();
    const timer = setInterval(ping, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", ping);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", ping);
      // Leaving the conversation: disappear for teammates now instead of after the expiry.
      api.delete(`/conversations/${conversationId}/presence`).catch(() => undefined);
    };
  }, [conversationId]);
}

/** Everyone *else* currently viewing a conversation (expired entries drop out on their own). */
export function useOtherViewers(conversationId: string): Viewer[] {
  const { user } = useAuth();
  const raw = useSyncExternalStore(
    subscribePresence,
    () => getViewers(conversationId),
    () => getViewers(conversationId),
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const next = raw.map((v) => v.until).filter((t) => t > Date.now());
    if (next.length === 0) return;
    // Wake up when the soonest entry expires, or when someone's typing indicator ends.
    const typing = raw.map((v) => v.typingUntil).filter((t) => t > Date.now());
    const wake = Math.min(...next, ...typing);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(wake - Date.now(), 0) + 50);
    return () => clearTimeout(timer);
  }, [raw, now]);

  return useMemo(
    () =>
      raw
        .filter((v) => v.userId !== user?.id && v.until > now)
        .map((v) => ({ ...v, typing: v.typing && v.typingUntil > now })),
    [raw, now, user?.id],
  );
}
