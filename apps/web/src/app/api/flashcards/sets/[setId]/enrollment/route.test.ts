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

const workspaceContext = {
  user: { id: "user-1" },
  workspace: { workspaceId: "workspace-1" },
};

const postEnrollment = (body: unknown) =>
  POST(
    new Request("http://localhost:3003/api/flashcards/sets/set-1/enrollment", {
      body: JSON.stringify(body),
      method: "POST",
    }),
    { params: Promise.resolve({ setId: "set-1" }) }
  );

describe("/api/flashcards/sets/[setId]/enrollment route", () => {
  beforeEach(() => {
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    upsertFlashcardSetEnrollmentForUserMock.mockReset();

    getWorkspaceContextForUserMock.mockResolvedValue(workspaceContext);
  });

  it("rejects invalid enrollment status before upserting", async () => {
    const response = await postEnrollment({ status: "archived" });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(upsertFlashcardSetEnrollmentForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
  });
});
