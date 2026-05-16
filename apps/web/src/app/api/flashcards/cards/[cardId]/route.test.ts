import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  archiveFlashcardCardForUserMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
  updateFlashcardCardForUserMock,
} = vi.hoisted(() => ({
  archiveFlashcardCardForUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  updateFlashcardCardForUserMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  archiveFlashcardCardForUser: archiveFlashcardCardForUserMock,
  updateFlashcardCardForUser: updateFlashcardCardForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { DELETE, PATCH } from "./route";

describe("/api/flashcards/cards/[cardId] route", () => {
  beforeEach(() => {
    archiveFlashcardCardForUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    updateFlashcardCardForUserMock.mockReset();

    invalidateFlashcardReadCachesMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized for all methods without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const patchResponse = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({}),
        method: "PATCH",
      }),
      { params: Promise.resolve({ cardId: "card-1" }) }
    );
    expect(patchResponse.status).toBe(401);

    const deleteResponse = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ cardId: "card-1" }),
    });
    expect(deleteResponse.status).toBe(401);
  });

  it("rejects invalid patch payloads", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          source: {
            concept: "Closures",
            subject: "JavaScript",
          },
        }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ cardId: "card-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "source with subject, topic, and concept is required for flashcard update",
    });
  });

  it("updates cards with normalized payloads and invalidates flashcard readers", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    updateFlashcardCardForUserMock.mockResolvedValue({
      id: "card-1",
      setId: "set-1",
    });

    const response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          backMarkdown: "  Back of card  ",
          frontMarkdown: "  Front of card  ",
          notesMarkdown: "   ",
          source: {
            concept: "  Closures  ",
            metadata: { origin: "manual" },
            subject: "  JavaScript  ",
            topic: "  Functions  ",
          },
          tags: ["  js  ", " ", " closures "],
        }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ cardId: "  card-1  " }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      card: {
        id: "card-1",
        setId: "set-1",
      },
    });
    expect(updateFlashcardCardForUserMock).toHaveBeenCalledWith({
      backMarkdown: "Back of card",
      cardId: "card-1",
      frontMarkdown: "Front of card",
      notesMarkdown: null,
      source: {
        concept: "Closures",
        metadata: { origin: "manual" },
        subject: "JavaScript",
        topic: "Functions",
      },
      tags: ["js", "closures"],
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      payload: {
        action: "updated",
        cardId: "card-1",
        setId: "set-1",
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });

  it("returns 404 when a card update cannot be persisted", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    updateFlashcardCardForUserMock.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          source: {
            concept: "Closures",
            subject: "JavaScript",
            topic: "Functions",
          },
        }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ cardId: "card-1" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Card not found",
    });
  });

  it("archives cards and publishes invalidation events", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    archiveFlashcardCardForUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "card-1", setId: "set-2" });

    let response = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ cardId: "card-1" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Card not found",
    });

    response = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ cardId: "  card-1  " }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(archiveFlashcardCardForUserMock).toHaveBeenLastCalledWith(
      "user-1",
      "workspace-1",
      "card-1"
    );
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      payload: {
        action: "deleted",
        cardId: "card-1",
        setId: "set-2",
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });
});
