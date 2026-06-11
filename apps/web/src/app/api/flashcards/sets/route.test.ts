import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFlashcardSetForUserMock,
  getRouteCacheVersionMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
} = vi.hoisted(() => ({
  createFlashcardSetForUserMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: { flashcards: "flashcards" },
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  createFlashcardSetForUser: createFlashcardSetForUserMock,
  listFlashcardSetSummariesForUser: vi.fn(),
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: vi.fn(),
  getCachedRoute: vi.fn(),
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: vi.fn(),
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { POST } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const postSet = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/flashcards/sets", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/flashcards/sets route", () => {
  beforeEach(() => {
    createFlashcardSetForUserMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects invalid set payloads before creating a set", async () => {
    const response = await postSet({ tags: "not-an-array" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(createFlashcardSetForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
  });
});
