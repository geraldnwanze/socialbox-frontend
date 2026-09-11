"use client";

/**
 * Token storage for this MVP: localStorage, not httpOnly cookies. Simple and sufficient for a
 * first release, but it does mean tokens are readable by any script running on the page — the
 * recommended next step (see backend README) is moving to httpOnly cookies once there's a
 * same-site deployment story between the API and this app.
 */
const ACCESS_TOKEN_KEY = "socialbox_access_token";
const REFRESH_TOKEN_KEY = "socialbox_refresh_token";
const WORKSPACE_ID_KEY = "socialbox_workspace_id";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(accessToken: string, refreshToken: string) {
  window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(WORKSPACE_ID_KEY);
}

export function setActiveWorkspaceId(workspaceId: string) {
  window.localStorage.setItem(WORKSPACE_ID_KEY, workspaceId);
}

export function clearActiveWorkspaceId() {
  window.localStorage.removeItem(WORKSPACE_ID_KEY);
}
