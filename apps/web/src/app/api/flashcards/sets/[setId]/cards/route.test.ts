import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFlashcardCardForUserMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
} = vi.hoisted(() => ({
  createFlashcardCardForUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
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

describe("/api/flashcards/sets/[setId]/cards route", () => {
  beforeEach(() => {
    createFlashcardCardForUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();

    invalidateFlashcardReadCachesMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({}),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "set-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid create payloads", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    let response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          backMarkdown: "Back only",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "set-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "frontMarkdown, backMarkdown, and source with subject, topic, and concept are required",
    });

    response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          backMarkdown: "Back",
          frontMarkdown: "Front",
          source: {
            concept: "Closures",
            subject: "JavaScript",
          },
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "set-1" }) }
    );

    expect(response.status).toBe(400);
  });

  it("creates cards with normalized payloads and invalidates flashcard readers", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createFlashcardCardForUserMock.mockResolvedValue({
      id: "card-1",
      setId: "set-1",
    });

    const response = await POST(
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
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "  set-1  " }) }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      card: {
        id: "card-1",
        setId: "set-1",
      },
    });
    expect(createFlashcardCardForUserMock).toHaveBeenCalledWith({
      backMarkdown: "Back of card",
      frontMarkdown: "Front of card",
      notesMarkdown: null,
      setId: "set-1",
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
        action: "created",
        cardId: "card-1",
        setId: "set-1",
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });

  it("returns 404 when the parent set cannot be resolved", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    createFlashcardCardForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          backMarkdown: "Back",
          frontMarkdown: "Front",
          source: {
            concept: "Closures",
            subject: "JavaScript",
            topic: "Functions",
          },
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "set-1" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Set not found",
    });
  });
});
