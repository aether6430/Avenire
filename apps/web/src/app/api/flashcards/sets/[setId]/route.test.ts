import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  archiveFlashcardSetForUserMock,
  getFlashcardSetForUserMock,
  getWorkspaceContextForUserMock,
  invalidateFlashcardReadCachesMock,
  publishWorkspaceStreamEventMock,
  updateFlashcardSetForUserMock,
} = vi.hoisted(() => ({
  archiveFlashcardSetForUserMock: vi.fn(),
  getFlashcardSetForUserMock: vi.fn(),
  getWorkspaceContextForUserMock: vi.fn(),
  invalidateFlashcardReadCachesMock: vi.fn(),
  publishWorkspaceStreamEventMock: vi.fn(),
  updateFlashcardSetForUserMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateFlashcardReadCaches: invalidateFlashcardReadCachesMock,
}));

vi.mock("@/lib/flashcards", () => ({
  archiveFlashcardSetForUser: archiveFlashcardSetForUserMock,
  getFlashcardSetForUser: getFlashcardSetForUserMock,
  updateFlashcardSetForUser: updateFlashcardSetForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getWorkspaceContextForUser: getWorkspaceContextForUserMock,
}));

vi.mock("@/lib/workspace-event-stream", () => ({
  publishWorkspaceStreamEvent: publishWorkspaceStreamEventMock,
}));

import { DELETE, GET, PATCH } from "./route";

const validSetId = "c729fdf9-945d-46bf-927b-a86b8ee90a07";

describe("/api/flashcards/sets/[setId] route", () => {
  beforeEach(() => {
    archiveFlashcardSetForUserMock.mockReset();
    getFlashcardSetForUserMock.mockReset();
    getWorkspaceContextForUserMock.mockReset();
    invalidateFlashcardReadCachesMock.mockReset();
    publishWorkspaceStreamEventMock.mockReset();
    updateFlashcardSetForUserMock.mockReset();

    invalidateFlashcardReadCachesMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized for all methods without a workspace context", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue(null);

    const getResponse = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });
    expect(getResponse.status).toBe(401);

    const patchResponse = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({ title: "Mindset set" }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ setId: validSetId }) }
    );
    expect(patchResponse.status).toBe(401);

    const deleteResponse = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });
    expect(deleteResponse.status).toBe(401);
  });

  it.each([
    {
      body: undefined,
      method: "GET" as const,
    },
    {
      body: { title: "Mindset set" },
      method: "PATCH" as const,
    },
    {
      body: undefined,
      method: "DELETE" as const,
    },
  ])("fails closed from $method when workspace context lookup throws before flashcard set route handling begins", async ({
    body,
    method,
  }) => {
    getWorkspaceContextForUserMock.mockRejectedValueOnce(
      new Error("flashcard set auth offline")
    );

    const response =
      method === "GET"
        ? await GET(new Request("http://localhost:3003"), {
            params: Promise.resolve({ setId: validSetId }),
          })
        : method === "PATCH"
          ? await PATCH(
              new Request("http://localhost:3003", {
                body: JSON.stringify(body),
                method: "PATCH",
              }),
              { params: Promise.resolve({ setId: validSetId }) }
            )
          : await DELETE(new Request("http://localhost:3003"), {
              params: Promise.resolve({ setId: validSetId }),
            });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "flashcard set auth offline",
    });
    expect(getFlashcardSetForUserMock).not.toHaveBeenCalled();
    expect(updateFlashcardSetForUserMock).not.toHaveBeenCalled();
    expect(archiveFlashcardSetForUserMock).not.toHaveBeenCalled();
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it("loads a set and returns 404 when it does not exist", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getFlashcardSetForUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: validSetId,
        title: "Mindset set",
      });

    const missingResponse = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });
    expect(missingResponse.status).toBe(404);
    await expect(missingResponse.json()).resolves.toEqual({
      error: "Set not found",
    });

    const okResponse = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });
    expect(okResponse.status).toBe(200);
    await expect(okResponse.json()).resolves.toEqual({
      set: { id: validSetId, title: "Mindset set" },
    });
  });

  it("returns a 500 json error when set loading throws", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    getFlashcardSetForUserMock.mockRejectedValueOnce(
      new Error("set detail offline")
    );

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "set detail offline",
    });
  });

  it("fails closed for invalid set ids before touching flashcard storage", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    const response = await GET(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: "intro-to-computers" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Set not found",
    });
    expect(getFlashcardSetForUserMock).not.toHaveBeenCalled();
  });

  it("rejects invalid patch payloads and normalizes valid updates", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });

    let response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({}),
        method: "PATCH",
      }),
      { params: Promise.resolve({ setId: validSetId }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Provide at least one Mindset Set field: title, description, tags",
    });

    updateFlashcardSetForUserMock.mockResolvedValue({
      id: validSetId,
      title: "Loops mindset set",
    });

    response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({
          description: "   ",
          tags: ["  loops  ", " "],
          title: "  Loops mindset set  ",
        }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ setId: validSetId }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      set: {
        id: validSetId,
        title: "Loops mindset set",
      },
    });
    expect(updateFlashcardSetForUserMock).toHaveBeenCalledWith({
      description: null,
      setId: validSetId,
      tags: ["loops"],
      title: "Loops mindset set",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      payload: {
        action: "updated",
        setId: validSetId,
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });

  it("returns 404 when a set update cannot be persisted", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    updateFlashcardSetForUserMock.mockResolvedValue(null);

    const response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({ title: "Mindset set" }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ setId: validSetId }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Set not found",
    });
  });

  it("returns a 500 json error when a set update throws before invalidation", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    updateFlashcardSetForUserMock.mockRejectedValueOnce(
      new Error("set update offline")
    );

    const response = await PATCH(
      new Request("http://localhost:3003", {
        body: JSON.stringify({ title: "Mindset set" }),
        method: "PATCH",
      }),
      { params: Promise.resolve({ setId: validSetId }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "set update offline",
    });
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });

  it("archives a set and publishes invalidation events", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    archiveFlashcardSetForUserMock
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "set-1" });

    let response = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Set not found",
    });

    response = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(invalidateFlashcardReadCachesMock).toHaveBeenCalledWith(
      "workspace-1"
    );
    expect(publishWorkspaceStreamEventMock).toHaveBeenCalledWith({
      payload: {
        action: "deleted",
        setId: validSetId,
        workspaceUuid: "workspace-1",
      },
      type: "flashcards.invalidate",
      workspaceUuid: "workspace-1",
    });
  });

  it("returns a 500 json error when set archival throws before invalidation", async () => {
    getWorkspaceContextForUserMock.mockResolvedValue({
      user: { id: "user-1" },
      workspace: { workspaceId: "workspace-1" },
    });
    archiveFlashcardSetForUserMock.mockRejectedValueOnce(
      new Error("set archive offline")
    );

    const response = await DELETE(new Request("http://localhost:3003"), {
      params: Promise.resolve({ setId: validSetId }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "set archive offline",
    });
    expect(invalidateFlashcardReadCachesMock).not.toHaveBeenCalled();
    expect(publishWorkspaceStreamEventMock).not.toHaveBeenCalled();
  });
});
