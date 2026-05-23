import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFlashcardSetForUserMock,
  createRouteCacheKeyMock,
  getCachedRouteMock,
  getRouteCacheVersionMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  listFlashcardSetSummariesForUserMock,
  publishWorkspaceStreamEventMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  createFlashcardSetForUserMock: vi.fn(),
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  listFlashcardSetSummariesForUserMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    flashcards: "flashcards",
  },
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  createFlashcardSetForUser: createFlashcardSetForUserMock,
  listFlashcardSetSummariesForUser: listFlashcardSetSummariesForUserMock,
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

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { GET, POST } from "./route";

describe("/api/flashcards/sets route", () => {
  beforeEach(() => {
    createFlashcardSetForUserMock.mockReset();
    createRouteCacheKeyMock.mockReset();
    getCachedRouteMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    listFlashcardSetSummariesForUserMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    setCachedRouteMock.mockReset();

    createRouteCacheKeyMock.mockReturnValue("flashcard-sets-cache-key");
    getRouteCacheVersionMock.mockResolvedValue("v1");
    invalidateFlashcardReadCachesMock.mockResolvedValue(undefined);
    setCachedRouteMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const getResponse = await GET();
    expect(getResponse.status).toBe(401);
    await expect(getResponse.json()).resolves.toEqual({
      error: "Unauthorized",
    });

    const postResponse = await POST(
      new Request("http://localhost:3003/api/flashcards/sets", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );
    expect(postResponse.status).toBe(401);
    await expect(postResponse.json()).resolves.toEqual({
      error: "Unauthorized",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(createRouteCacheKeyMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      body: undefined,
      method: "GET" as const,
    },
    {
      body: { title: "Mindset set" },
      method: "POST" as const,
    },
  ])("fails closed from $method when workspace context lookup throws before flashcard sets route handling begins", async ({
    body,
    method,
  }) => {
    getWorkspaceContextForUserMock.mockRejectedValueOnce(
      new Error("flashcard sets auth offline")
    );

    const response =
      method === "GET"
        ? await GET()
        : await POST(
            new Request("http://localhost:3003/api/flashcards/sets", {
              body: JSON.stringify(body),
              method: "POST",
            })
          );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "flashcard sets auth offline",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(listFlashcardSetSummariesForUserMock).not.toHaveBeenCalled();
    expect(createFlashcardSetForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it("returns cached set summaries with a hit header", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue({
      sets: [{ id: "set-1" }],
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      sets: [{ id: "set-1" }],
    });
    expect(listFlashcardSetSummariesForUserMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("loads and caches set summaries on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardSetSummariesForUserMock.mockResolvedValue([{ id: "set-2" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("miss");
    expect(getRouteCacheVersionMock).toHaveBeenCalledWith(
      "flashcards",
      "workspace-1"
    );
    expect(createRouteCacheKeyMock).toHaveBeenCalledWith({
      namespace: "flashcards",
      params: { route: "sets" },
      scope: "workspace-1",
      version: "v1",
    });
    await expect(response.json()).resolves.toEqual({
      sets: [{ id: "set-2" }],
    });
    expect(listFlashcardSetSummariesForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1"
    );
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      "flashcards",
      "flashcard-sets-cache-key",
      {
        sets: [{ id: "set-2" }],
      }
    );
  });

  it("returns a 500 json error when set summaries loading throws on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardSetSummariesForUserMock.mockRejectedValueOnce(
      new Error("sets offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "sets offline",
    });
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("rejects invalid create payloads", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/sets", {
        body: JSON.stringify({
          tags: ["ok", 5],
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid Mindset Set payload",
    });
  });

  it("creates flashcard sets with normalized payloads and invalidates cache readers", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-3",
      title: "Closure deck",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/sets", {
        body: JSON.stringify({
          description: "  Study weak closure patterns  ",
          tags: ["  javascript  ", "  ", "closures  "],
          title: "  Closure deck  ",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      set: {
        id: "set-3",
        title: "Closure deck",
      },
    });
    expect(createFlashcardSetForUserMock).toHaveBeenCalledWith({
      description: "Study weak closure patterns",
      tags: ["javascript", "closures"],
      title: "Closure deck",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      payload: {
        action: "created",
        setId: "set-3",
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });

  it("returns a 500 json error when flashcard set creation throws before invalidation work", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createFlashcardSetForUserMock.mockRejectedValueOnce(
      new Error("set create offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/sets", {
        body: JSON.stringify({ title: "Closure deck" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "set create offline",
    });
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when flashcard cache invalidation throws after creation", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createFlashcardSetForUserMock.mockResolvedValue({
      id: "set-3",
      title: "Closure deck",
    });
    invalidateFlashcardReadCachesMock.mockRejectedValueOnce(
      new Error("flashcards cache offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/sets", {
        body: JSON.stringify({ title: "Closure deck" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "flashcards cache offline",
    });
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it("maps failed set creation to a bad request", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createFlashcardSetForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/sets", {
        body: JSON.stringify({ title: "Manual set" }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Could not create the Mindset Set.",
    });
  });
});
