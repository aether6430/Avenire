import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  createRouteCacheKeyMock,
  getCachedRouteMock,
  handleChatHistoryRouteGetMock,
  getRouteCacheVersionMock,
  headersMock,
  listChatsForUserMock,
  resolveWorkspaceForUserMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  handleChatHistoryRouteGetMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  headersMock: vi.fn(),
  listChatsForUserMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/chat-data", () => ({
  listChatsForUser: listChatsForUserMock,
}));

vi.mock("@/lib/file-data", () => ({
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: createRouteCacheKeyMock,
  getCachedRoute: getCachedRouteMock,
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: setCachedRouteMock,
}));

import { GET } from "./route";

describe("/api/chat/history route", () => {
  beforeEach(() => {
    authGetSessionMock.mockReset();
    createRouteCacheKeyMock.mockReset();
    getCachedRouteMock.mockReset();
    handleChatHistoryRouteGetMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    headersMock.mockReset();
    listChatsForUserMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    setCachedRouteMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
    createRouteCacheKeyMock.mockReturnValue("cache-key");
    getRouteCacheVersionMock.mockResolvedValue("v1");
  });

  it("returns unauthorized when there is no signed-in session", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(createRouteCacheKeyMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
  });

  it("builds stable cache keys for equivalent params even when key order differs", async () => {
    const { createRouteCacheKey } =
      await vi.importActual<typeof import("@/lib/route-cache")>(
        "@/lib/route-cache"
      );

    const first = createRouteCacheKey({
      namespace: "flashcards",
      params: {
        from: "2026-05-01",
        route: "revision-calendar",
        to: "2026-05-31",
      },
      scope: "workspace-1",
      version: "1",
    });
    const second = createRouteCacheKey({
      namespace: "flashcards",
      params: {
        route: "revision-calendar",
        to: "2026-05-31",
        from: "2026-05-01",
      },
      scope: "workspace-1",
      version: "1",
    });

    expect(first).toBe(second);
    expect(
      createRouteCacheKey({
        namespace: "workspace",
        params: { route: "revision-calendar" },
        scope: "workspace-1",
        version: "1",
      })
    ).not.toBe(
      createRouteCacheKey({
        namespace: "flashcards",
        params: { route: "revision-calendar" },
        scope: "workspace-1",
        version: "1",
      })
    );
  });

  it("returns workspace not found when the active workspace is missing", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(createRouteCacheKeyMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns cached chats on cache hit", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue({
      chats: [{ id: "chat-1" }],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-chats-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      chats: [{ id: "chat-1" }],
    });
    expect(listChatsForUserMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("loads, caches, and returns chats on cache miss", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue(null);
    listChatsForUserMock.mockResolvedValue([{ id: "chat-1" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-chats-cache")).toBe("miss");
    expect(getRouteCacheVersionMock).toHaveBeenCalledWith(
      "chats:list",
      "workspace-1"
    );
    expect(createRouteCacheKeyMock).toHaveBeenCalledWith({
      namespace: "chats:list",
      scope: "workspace-1",
      version: "v1",
    });
    await expect(response.json()).resolves.toEqual({
      chats: [{ id: "chat-1" }],
    });
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      expect.any(String),
      "cache-key",
      { chats: [{ id: "chat-1" }] }
    );
  });

  it("maps lower-layer history failures to stable json", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue(null);
    listChatsForUserMock.mockRejectedValue(new Error("cache exploded"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "cache exploded",
    });
  });

  it("returns a 500 json error when chat-directory session resolution throws before history lookup", async () => {
    authGetSessionMock.mockRejectedValueOnce(new Error("chat session offline"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "chat session offline",
    });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(listChatsForUserMock).not.toHaveBeenCalled();
  });

  it("fails closed when the route wrapper handler throws before returning a response", async () => {
    vi.resetModules();
    handleChatHistoryRouteGetMock.mockRejectedValueOnce(
      new Error("chat history wrapper offline")
    );

    vi.doMock("./chat-history-route-get", () => ({
      handleChatHistoryRouteGet: handleChatHistoryRouteGetMock,
    }));

    try {
      const { GET } = await import("./route");
      const response = await GET();

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "chat history wrapper offline",
      });
    } finally {
      vi.doUnmock("./chat-history-route-get");
      vi.resetModules();
    }
  });
});
