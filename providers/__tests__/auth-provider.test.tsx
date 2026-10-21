import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/providers/auth-provider";
import { setActiveWorkspaceId, setTokens } from "@/lib/auth-storage";
import type { ReactNode } from "react";

const get = vi.fn();
const post = vi.fn();
const push = vi.fn();
vi.mock("@/lib/api-client", async (orig) => ({ ...(await orig<typeof import("@/lib/api-client")>()), api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
const user = { id: "u1", email: "ann@x.com", fullName: "Ann Lee" };

describe("AuthProvider", () => {
  beforeEach(() => localStorage.clear());

  it("with no saved session it is immediately signed out and never calls the API", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(get).not.toHaveBeenCalled();
  });

  it("restores a saved session by asking the server who you are", async () => {
    setTokens("a", "r");
    get.mockResolvedValue(user);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(user));
    expect(get).toHaveBeenCalledWith("/auth/me", { skipWorkspaceHeader: true });
    expect(result.current.isLoading).toBe(false);
  });

  it("treats a rejected saved session as signed out", async () => {
    setTokens("expired", "r");
    get.mockRejectedValue(new Error("401"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("logging in stores the tokens, sets the user and goes to the workspace picker", async () => {
    post.mockResolvedValue({ user, accessToken: "acc", refreshToken: "ref" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(() => result.current.login("ann@x.com", "secret"));

    expect(post).toHaveBeenCalledWith("/auth/login", { email: "ann@x.com", password: "secret" }, { skipWorkspaceHeader: true });
    expect(localStorage.getItem("socialbox_access_token")).toBe("acc");
    expect(localStorage.getItem("socialbox_refresh_token")).toBe("ref");
    expect(result.current.user).toEqual(user);
    expect(push).toHaveBeenCalledWith("/workspaces");
  });

  it("a failed login stores nothing and lets the error reach the form", async () => {
    post.mockRejectedValue(new Error("Invalid credentials"));
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await expect(act(() => result.current.login("a@b.c", "wrong"))).rejects.toThrow("Invalid credentials");
    expect(localStorage.getItem("socialbox_access_token")).toBeNull();
    expect(push).not.toHaveBeenCalled();
  });

  it("registering signs you in the same way", async () => {
    post.mockResolvedValue({ user, accessToken: "acc", refreshToken: "ref" });
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await act(() => result.current.register("ann@x.com", "password123", "Ann Lee"));
    expect(post).toHaveBeenCalledWith("/auth/register", { email: "ann@x.com", password: "password123", fullName: "Ann Lee" }, { skipWorkspaceHeader: true });
    expect(result.current.user).toEqual(user);
  });

  it("logging out clears tokens and the chosen workspace and returns to the login page", async () => {
    setTokens("a", "r");
    setActiveWorkspaceId("ws-1");
    get.mockResolvedValue(user);
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.user).toEqual(user));

    await act(() => result.current.logout());

    expect(localStorage.getItem("socialbox_access_token")).toBeNull();
    expect(localStorage.getItem("socialbox_workspace_id")).toBeNull();
    expect(result.current.user).toBeNull();
    expect(push).toHaveBeenCalledWith("/login");
  });

  it("refuses to be used outside the provider (so a missing provider is caught early)", () => {
    expect(() => renderHook(() => useAuth())).toThrow(/within AuthProvider/);
  });
});
