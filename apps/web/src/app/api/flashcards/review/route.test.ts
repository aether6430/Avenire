import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
  reviewFlashcardForUserMock,
} = vi.hoisted(() => ({
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  reviewFlashcardForUserMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  reviewFlashcardForUser: reviewFlashcardForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

vi.mock("@/lib/learning-automation", () => ({}));

import { POST } from "./route";

describe("/api/flashcards/review route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    reviewFlashcardForUserMock.mockReset();

    invalidateFlashcardReadCachesMock.mockResolvedValue(undefined);
    publishWorkspaceStreamEventMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/review", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid review payloads", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/review", {
        body: JSON.stringify({
          cardId: "   ",
          rating: "perfect",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cardId and a valid rating are required",
    });
  });

  it("returns not found when the reviewed card cannot be resolved", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    reviewFlashcardForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/review", {
        body: JSON.stringify({
          cardId: "card-1",
          rating: "again",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Card not found" });
  });

  it("reviews a card with normalized payloads and invalidates flashcard caches", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    reviewFlashcardForUserMock.mockResolvedValue({
      nextDueAt: "2026-05-14T00:00:00.000Z",
      rating: "good",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/flashcards/review", {
        body: JSON.stringify({
          answerText: "   ",
          cardId: "  card-1  ",
          rating: "good",
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      nextDueAt: "2026-05-14T00:00:00.000Z",
      rating: "good",
    });
    expect(reviewFlashcardForUserMock).toHaveBeenCalledWith({
      answerText: null,
      cardId: "card-1",
      rating: "good",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      payload: {
        action: "reviewed",
        cardId: "card-1",
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });
});
