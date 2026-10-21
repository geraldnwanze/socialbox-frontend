/** Tiny pub/sub so the socket listener (mounted once) can tell the open conversation someone is typing. */
type Listener = (conversationId: string) => void;
const listeners = new Set<Listener>();

export function emitTyping(conversationId: string) {
  listeners.forEach((listener) => listener(conversationId));
}

export function onTyping(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
