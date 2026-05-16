import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  createRouteCacheKeyMock,
  getCachedRouteMock,
  getRouteCacheVersionMock,
  headersMock,
  listChatsForUserMock,
  resolveWorkspaceForUserMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
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
});
