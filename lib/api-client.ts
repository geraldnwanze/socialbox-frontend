"use client";

import {
  clearActiveWorkspaceId,
  clearTokens,
  getAccessToken,
  getActiveWorkspaceId,
  getRefreshToken,
  setTokens,
} from "./auth-storage";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Explicitly opt out of sending X-Workspace-Id (auth endpoints, workspace list/create). */
  skipWorkspaceHeader?: boolean;
  /** Internal: prevents infinite refresh loops. */
  _retried?: boolean;
}

let refreshPromise: Promise<void> | null = null;

async function refreshTokens(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) throw new ApiError(401, "NO_REFRESH_TOKEN", "Not signed in");

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    clearTokens();
    clearActiveWorkspaceId();
    throw new ApiError(401, "REFRESH_FAILED", "Session expired");
  }
  const data = await response.json();
  setTokens(data.accessToken, data.refreshToken);
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipWorkspaceHeader, _retried, headers, ...rest } = options;

  const requestHeaders: Record<string, string> = {
    "content-type": "application/json",
    // Skips ngrok's free-tier interstitial page, which otherwise replaces API responses with HTML.
    "ngrok-skip-browser-warning": "1",
    ...(headers as Record<string, string> | undefined),
  };

  const accessToken = getAccessToken();
  if (accessToken) requestHeaders["authorization"] = `Bearer ${accessToken}`;

  if (!skipWorkspaceHeader) {
    const workspaceId = getActiveWorkspaceId();
    if (workspaceId) requestHeaders["x-workspace-id"] = workspaceId;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !_retried && getRefreshToken()) {
    // Coalesce concurrent 401s into a single refresh call.
    refreshPromise ??= refreshTokens().finally(() => {
      refreshPromise = null;
    });
    try {
      await refreshPromise;
      return apiFetch<T>(path, { ...options, _retried: true });
    } catch {
      // This module sits outside React (used by TanStack Query fetchers), so it has no
      // access to next/navigation's router — a hard redirect is the only option here, and
      // is appropriate anyway since the whole app's client state needs to reset on logout.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      if (typeof window !== "undefined") window.location.href = "/login";
      throw new ApiError(401, "SESSION_EXPIRED", "Your session expired — please sign in again");
    }
  }

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : undefined;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.code ?? "UNKNOWN_ERROR",
      payload?.message ?? "Something went wrong",
    );
  }

  return payload as T;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "POST", body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    apiFetch<T>(path, { ...options, method: "PATCH", body }),
  delete: <T>(path: string, options?: RequestOptions) => apiFetch<T>(path, { ...options, method: "DELETE" }),
};

export { API_URL };
