import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, api } from "@/lib/api-client";
import { setActiveWorkspaceId, setTokens } from "@/lib/auth-storage";

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { "content-type": "application/json" },
  });

describe("api client", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("sends the access token and the active workspace, and parses JSON", async () => {
    setTokens("access-1", "refresh-1");
    setActiveWorkspaceId("ws-1");
    fetchMock.mockResolvedValue(json(200, { ok: true }));

    expect(await api.get<{ ok: boolean }>("/things")).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:3001/things");
    expect(init.headers).toMatchObject({ authorization: "Bearer access-1", "x-workspace-id": "ws-1" });
  });

  it("can skip the workspace header (workspace list, auth)", async () => {
    setTokens("a", "r");
    setActiveWorkspaceId("ws-1");
    fetchMock.mockResolvedValue(json(200, []));
    await api.get("/workspaces", { skipWorkspaceHeader: true });
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("x-workspace-id");
  });

  it("serialises bodies and returns undefined for 204", async () => {
    fetchMock.mockResolvedValue(json(204));
    expect(await api.post("/x", { a: 1 })).toBeUndefined();
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", body: '{"a":1}' });
  });

  it("turns API errors into ApiError with the server's code and message", async () => {
    fetchMock.mockResolvedValue(json(409, { code: "CONFLICT", message: "The shortcut is already in use" }));
    await expect(api.post("/canned-responses", {})).rejects.toMatchObject({
      name: "ApiError",
      status: 409,
      code: "CONFLICT",
      message: "The shortcut is already in use",
    });
    fetchMock.mockResolvedValue(json(500));
    await expect(api.get("/x")).rejects.toBeInstanceOf(ApiError);
  });

  it("refreshes an expired token once and retries the request", async () => {
    setTokens("old-access", "refresh-1");
    fetchMock
      .mockResolvedValueOnce(json(401, { message: "expired" }))
      .mockResolvedValueOnce(json(200, { accessToken: "new-access", refreshToken: "refresh-2" }))
      .mockResolvedValueOnce(json(200, { data: 1 }));

    expect(await api.get("/me")).toEqual({ data: 1 });

    expect(fetchMock.mock.calls[1][0]).toContain("/auth/refresh");
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject({ authorization: "Bearer new-access" });
    expect(localStorage.getItem("socialbox_refresh_token")).toBe("refresh-2");
  });

  it("coalesces simultaneous 401s into a single refresh", async () => {
    setTokens("old", "refresh-1");
    let refreshCalls = 0;
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url.includes("/auth/refresh")) {
        refreshCalls++;
        return json(200, { accessToken: "new", refreshToken: "refresh-2" });
      }
      const auth = (init.headers as Record<string, string>).authorization;
      return auth === "Bearer new" ? json(200, { ok: true }) : json(401, {});
    });

    await Promise.all([api.get("/a"), api.get("/b"), api.get("/c")]);
    expect(refreshCalls).toBe(1);
  });

  it("signs the user out when the refresh itself fails", async () => {
    setTokens("old", "bad-refresh");
    setActiveWorkspaceId("ws-1");
    const original = window.location;
    Object.defineProperty(window, "location", { value: { href: "" }, writable: true });
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));

    await expect(api.get("/me")).rejects.toMatchObject({ code: "SESSION_EXPIRED" });

    expect(localStorage.getItem("socialbox_access_token")).toBeNull();
    expect(localStorage.getItem("socialbox_workspace_id")).toBeNull();
    expect(window.location.href).toBe("/login");
    Object.defineProperty(window, "location", { value: original, writable: true });
  });
});
