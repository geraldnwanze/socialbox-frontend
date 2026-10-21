"use client";

import { useEffect, useState } from "react";
import { onTyping } from "@/lib/typing-events";

const VISIBLE_MS = 5000;

/** "Customer is typing…" for a few seconds after each typing event for this conversation. */
export function TypingIndicator({ conversationId, name }: { conversationId: string; name?: string | null }) {
  const [until, setUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    return onTyping((id) => {
      if (id === conversationId) {
        setUntil(Date.now() + VISIBLE_MS);
        setNow(Date.now());
      }
    });
  }, [conversationId]);

  useEffect(() => {
    if (until <= Date.now()) return;
    const timer = setTimeout(() => setNow(Date.now()), until - Date.now() + 50);
    return () => clearTimeout(timer);
  }, [until]);

  if (until <= now) return null;
  return (
    <p className="px-4 pb-1 text-xs text-muted-foreground" aria-live="polite">
      {name ?? "The customer"} is typing…
    </p>
  );
}
