import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assertFlashcardTaxonomyMock,
  createFlashcardCardForUserMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
} = vi.hoisted(() => ({
  assertFlashcardTaxonomyMock: vi.fn(),
  createFlashcardCardForUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  assertFlashcardTaxonomy: assertFlashcardTaxonomyMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  createFlashcardCardForUser: createFlashcardCardForUserMock,
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

const postCard = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/flashcards/sets/set-1/cards", {
      body: JSON.stringify(body),
      method: "POST",
    }),
    { params: Promise.resolve({ setId: "set-1" }) }
  );

describe("/api/flashcards/sets/[setId]/cards route", () => {
  beforeEach(() => {
    assertFlashcardTaxonomyMock.mockReset();
    createFlashcardCardForUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects missing taxonomy before creating a card", async () => {
    assertFlashcardTaxonomyMock.mockImplementation(() => {
      throw new Error("missing taxonomy");
    });

    const response = await postCard({
      backMarkdown: "Back",
      frontMarkdown: "Front",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "source with subject, topic, and concept is required for flashcard creation",
    });
    expect(createFlashcardCardForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
  });
});
