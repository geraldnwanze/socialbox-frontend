export interface Viewer {
  userId: string;
  name: string;
  typing: boolean;
  /** Epoch ms after which this person is considered gone unless a newer snapshot arrives. */
  until: number;
  typingUntil: number;
}

const EMPTY: Viewer[] = [];
const byConversation = new Map<string, Viewer[]>();
const listeners = new Set<() => void>();

/** Replaces what we know about one conversation (the server sends full snapshots). */
export function applyPresence(conversationId: string, viewers: Viewer[]) {
  if (viewers.length === 0) byConversation.delete(conversationId);
  else byConversation.set(conversationId, viewers);
  listeners.forEach((listener) => listener());
}

export function subscribePresence(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getViewers(conversationId: string): Viewer[] {
  return byConversation.get(conversationId) ?? EMPTY;
}
