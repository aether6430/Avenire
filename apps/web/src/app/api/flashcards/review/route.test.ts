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

vi.mock("@/lib/learning-automation", () => ({}));

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

const postReview = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/flashcards/review", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );

describe("/api/flashcards/review route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    reviewFlashcardForUserMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects invalid ratings before reviewing the card", async () => {
    const response = await postReview({
      cardId: "card-1",
      rating: "excellent",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "cardId and rating are required",
    });
    expect(reviewFlashcardForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
  });

  it("forwards valid ratings to the review service", async () => {
    reviewFlashcardForUserMock.mockResolvedValue({
      card: { id: "card-1" },
      nextState: { state: "learning" },
    });

    const response = await postReview({
      answerText: "My answer",
      cardId: "card-1",
      rating: "good",
    });

    expect(response.status).toBe(200);
    expect(reviewFlashcardForUserMock).toHaveBeenCalledWith({
      answerText: "My answer",
      cardId: "card-1",
      rating: "good",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "flashcards.invalidate",
        workspaceUuid: "workspace-1",
      })
    );
  });
});
