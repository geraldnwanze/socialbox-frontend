import { io, type Socket } from "socket.io-client";
import { API_URL } from "./api-client";
import { getAccessToken } from "./auth-storage";

export function createSocket(workspaceId: string): Socket {
  return io(API_URL, {
    auth: { token: getAccessToken(), workspaceId },
    // Start on polling and let engine.io upgrade to websocket — a websocket-only connection
    // fails outright behind proxies/sandboxes that don't support the raw upgrade.
    transports: ["polling", "websocket"],
    autoConnect: true,
  });
}
