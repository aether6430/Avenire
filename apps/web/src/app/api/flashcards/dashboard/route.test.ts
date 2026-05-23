import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRouteCacheKeyMock,
  getCachedRouteMock,
  getFlashcardDashboardForUserMock,
  getRouteCacheVersionMock,
  getWorkspaceContextForUserMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getFlashcardDashboardForUserMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    flashcards: "flashcards",
  },
}));

vi.mock("@/lib/flashcards", () => ({
  getFlashcardDashboardForUser: getFlashcardDashboardForUserMock,
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: createRouteCacheKeyMock,
  getCachedRoute: getCachedRouteMock,
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: setCachedRouteMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { GET } from "./route";

describe("/api/flashcards/dashboard route", () => {
  beforeEach(() => {
    createRouteCacheKeyMock.mockReset();
    getCachedRouteMock.mockReset();
    getFlashcardDashboardForUserMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    setCachedRouteMock.mockReset();

    createRouteCacheKeyMock.mockReturnValue("flashcards-dashboard-cache-key");
    getRouteCacheVersionMock.mockResolvedValue("v1");
    setCachedRouteMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized when there is no workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when workspace context lookup throws before dashboard loading begins", async () => {
    getWorkspaceContextForUserMock.mockRejectedValueOnce(
      new Error("dashboard auth offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "dashboard auth offline",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(getFlashcardDashboardForUserMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns cached dashboard payloads with a hit header", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue({
      dashboard: { dueCount: 4 },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      dashboard: { dueCount: 4 },
    });
    expect(getFlashcardDashboardForUserMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the dashboard loader has no accessible data", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    getFlashcardDashboardForUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Dashboard not found",
    });
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("loads and caches dashboard payloads on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    getFlashcardDashboardForUserMock.mockResolvedValue({
      dueCount: 7,
      sets: [{ id: "set-1" }],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("miss");
    await expect(response.json()).resolves.toEqual({
      dashboard: {
        dueCount: 7,
        sets: [{ id: "set-1" }],
      },
    });
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      "flashcards",
      "flashcards-dashboard-cache-key",
      {
        dashboard: {
          dueCount: 7,
          sets: [{ id: "set-1" }],
        },
      }
    );
  });

  it("returns a 500 json error when dashboard loading throws on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    getFlashcardDashboardForUserMock.mockRejectedValueOnce(
      new Error("dashboard offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "dashboard offline",
    });
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when dashboard cache persistence throws after loading", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    getFlashcardDashboardForUserMock.mockResolvedValue({
      dueCount: 7,
      sets: [{ id: "set-1" }],
    });
    setCachedRouteMock.mockRejectedValueOnce(
      new Error("dashboard cache offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "dashboard cache offline",
    });
  });
});
