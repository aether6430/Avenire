import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
  updateFlashcardCardForUserMock,
} = vi.hoisted(() => ({
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  updateFlashcardCardForUserMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  assertFlashcardTaxonomy: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  archiveFlashcardCardForUser: vi.fn(),
  updateFlashcardCardForUser: updateFlashcardCardForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { PATCH } from "./route";

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const patchCard = (body: unknown) =>
  PATCH(
    new Request("http://localhost:3003/api/flashcards/cards/card-1", {
      body: JSON.stringify(body),
      method: "PATCH",
    }),
    { params: Promise.resolve({ cardId: "card-1" }) }
  );

describe("/api/flashcards/cards/[cardId] route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    updateFlashcardCardForUserMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects invalid card updates before calling the database", async () => {
    const response = await patchCard({ frontMarkdown: ["not", "string"] });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(updateFlashcardCardForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
  });
});
