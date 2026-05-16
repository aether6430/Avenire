import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  upsertFlashcardSetEnrollmentForUserMock,
} = vi.hoisted(() => ({
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  upsertFlashcardSetEnrollmentForUserMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  upsertFlashcardSetEnrollmentForUser: upsertFlashcardSetEnrollmentForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

import { POST } from "./route";

describe("/api/flashcards/sets/[setId]/enrollment route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    upsertFlashcardSetEnrollmentForUserMock.mockReset();

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

  it("rejects invalid enrollment payloads", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    let response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          newCardsPerDay: 0,
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "set-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        "status must be active or paused and newCardsPerDay must be an integer between 1 and 100",
    });

    response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          status: "stopped",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "set-1" }) }
    );

    expect(response.status).toBe(400);
  });

  it("upserts enrollment with normalized route params and invalidates flashcard readers", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    upsertFlashcardSetEnrollmentForUserMock.mockResolvedValue({
      newCardsPerDay: 12,
      setId: "set-1",
      status: "paused",
    });

    const response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          newCardsPerDay: 12,
          status: "paused",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ setId: "  set-1  " }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      enrollment: {
        newCardsPerDay: 12,
        setId: "set-1",
        status: "paused",
      },
    });
    expect(upsertFlashcardSetEnrollmentForUserMock).toHaveBeenCalledWith({
      newCardsPerDay: 12,
      setId: "set-1",
      status: "paused",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
  });

  it("returns 404 when the target set cannot be resolved", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    upsertFlashcardSetEnrollmentForUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          status: "active",
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
