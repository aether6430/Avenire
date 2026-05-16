import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRouteCacheKeyMock,
  getCachedRouteMock,
  getRouteCacheVersionMock,
  getWorkspaceContextForUserMock,
  listDueFlashcardsForUserMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  listDueFlashcardsForUserMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    flashcards: "flashcards",
  },
}));

vi.mock("@/lib/flashcards", () => ({
  listDueFlashcardsForUser: listDueFlashcardsForUserMock,
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

describe("/api/flashcards/review/queue route", () => {
  beforeEach(() => {
    createRouteCacheKeyMock.mockReset();
    getCachedRouteMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    listDueFlashcardsForUserMock.mockReset();
    setCachedRouteMock.mockReset();

    createRouteCacheKeyMock.mockReturnValue(
      "flashcards-review-queue-cache-key"
    );
    getRouteCacheVersionMock.mockResolvedValue("v1");
    setCachedRouteMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/flashcards/review/queue")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns cached queue payloads with a hit header", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue({
      queue: [{ id: "card-1" }],
    });

    const response = await GET(
      new Request("http://localhost:3003/api/flashcards/review/queue?limit=20")
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      queue: [{ id: "card-1" }],
    });
    expect(listDueFlashcardsForUserMock).not.toHaveBeenCalled();
  });

  it("loads and caches a normalized queue on a cache miss", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getCachedRouteMock.mockResolvedValue(null);
    listDueFlashcardsForUserMock.mockResolvedValue([{ id: "card-2" }]);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/review/queue?setId=%20%20set-1%20%20&limit=500&drill=%7B%22subject%22%3A%22%20JavaScript%20%22%2C%22topic%22%3A%22%20Functions%20%22%2C%22concept%22%3A%22%20Closures%20%22%7D&drill=not-json"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("miss");
    await expect(response.json()).resolves.toEqual({
      queue: [{ id: "card-2" }],
    });
    expect(createRouteCacheKeyMock).toHaveBeenCalledWith({
      namespace: "flashcards",
      params: {
        limit: 100,
        route: "review-queue",
        setId: "set-1",
        taxonomyFilters: [
          {
            concept: "Closures",
            subject: "JavaScript",
            topic: "Functions",
          },
        ],
      },
      scope: "workspace-1",
      version: "v1",
    });
    expect(listDueFlashcardsForUserMock).toHaveBeenCalledWith({
      limit: 100,
      setId: "set-1",
      taxonomyFilters: [
        {
          concept: "Closures",
          subject: "JavaScript",
          topic: "Functions",
        },
      ],
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      "flashcards",
      "flashcards-review-queue-cache-key",
      {
        queue: [{ id: "card-2" }],
      }
    );
  });
});
