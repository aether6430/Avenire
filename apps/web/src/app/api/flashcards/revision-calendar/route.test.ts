import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  createRouteCacheKeyMock,
  getCachedRouteMock,
  getRouteCacheVersionMock,
  headersMock,
  listFlashcardDueCountsByDayForUserMock,
  resolveWorkspaceForUserMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  createRouteCacheKeyMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  headersMock: vi.fn(),
  listFlashcardDueCountsByDayForUserMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/file-data", () => ({
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    flashcards: "flashcards",
  },
}));

vi.mock("@/lib/flashcards", () => ({
  listFlashcardDueCountsByDayForUser: listFlashcardDueCountsByDayForUserMock,
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: createRouteCacheKeyMock,
  getCachedRoute: getCachedRouteMock,
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: setCachedRouteMock,
}));

import { GET } from "./route";

describe("/api/flashcards/revision-calendar route", () => {
  beforeEach(() => {
    authGetSessionMock.mockReset();
    createRouteCacheKeyMock.mockReset();
    getCachedRouteMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    headersMock.mockReset();
    listFlashcardDueCountsByDayForUserMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();
    setCachedRouteMock.mockReset();

    createRouteCacheKeyMock.mockReturnValue(
      "flashcards-revision-calendar-cache-key"
    );
    getRouteCacheVersionMock.mockResolvedValue("v1");
    headersMock.mockResolvedValue(new Headers());
    setCachedRouteMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized without a session user", async () => {
    authGetSessionMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/flashcards/revision-calendar")
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid date ranges", async () => {
    authGetSessionMock.mockResolvedValue({
      user: { id: "user-1" },
    });

    let response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=bad&to=2026-05-03"
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid date range",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();

    response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-05-04&to=2026-05-03"
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid date range",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();

    response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-02-31&to=2026-03-03"
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid date range",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the active workspace cannot be resolved", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-05-01&to=2026-05-03"
      )
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Workspace not found",
    });
    expect(resolveWorkspaceForUserMock).toHaveBeenCalledWith("user-1", "org-1");
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns cached grouped calendar payloads with a hit header", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue({
      data: {
        "2026-05-01": [
          {
            dueCount: 2,
            id: "set-1-2026-05-01",
            setId: "set-1",
            title: "Closures",
          },
        ],
      },
    });

    const response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-05-01&to=2026-05-03"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      data: {
        "2026-05-01": [
          {
            dueCount: 2,
            id: "set-1-2026-05-01",
            setId: "set-1",
            title: "Closures",
          },
        ],
      },
    });
    expect(listFlashcardDueCountsByDayForUserMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("loads due rows, groups them by day, and caches the payload on a miss", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardDueCountsByDayForUserMock.mockResolvedValue([
      {
        day: "2026-05-01",
        dueCount: 2,
        setId: "set-1",
        setTitle: "Closures",
      },
      {
        day: "2026-05-01",
        dueCount: 1,
        setId: "set-2",
        setTitle: "Promises",
      },
    ]);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=%202026-05-01%20&to=%202026-05-03%20"
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-flashcards-cache")).toBe("miss");
    await expect(response.json()).resolves.toEqual({
      data: {
        "2026-05-01": [
          {
            dueCount: 2,
            id: "set-1-2026-05-01",
            setId: "set-1",
            title: "Closures",
          },
          {
            dueCount: 1,
            id: "set-2-2026-05-01",
            setId: "set-2",
            title: "Promises",
          },
        ],
      },
    });
    expect(getRouteCacheVersionMock).toHaveBeenCalledWith(
      "flashcards",
      "workspace-1"
    );
    expect(createRouteCacheKeyMock).toHaveBeenCalledWith({
      namespace: "flashcards",
      params: {
        from: "2026-05-01",
        route: "revision-calendar",
        to: "2026-05-03",
      },
      scope: "workspace-1",
      version: "v1",
    });
    expect(listFlashcardDueCountsByDayForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-03T00:00:00.000Z")
    );
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      "flashcards",
      "flashcards-revision-calendar-cache-key",
      {
        data: {
          "2026-05-01": [
            {
              dueCount: 2,
              id: "set-1-2026-05-01",
              setId: "set-1",
              title: "Closures",
            },
            {
              dueCount: 1,
              id: "set-2-2026-05-01",
              setId: "set-2",
              title: "Promises",
            },
          ],
        },
      }
    );
  });

  it("returns a 500 json error when revision calendar session lookup throws", async () => {
    authGetSessionMock.mockRejectedValueOnce(
      new Error("calendar session offline")
    );

    const response = await GET(
      new Request("http://localhost:3003/api/flashcards/revision-calendar")
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "calendar session offline",
    });
    expect(getRouteCacheVersionMock).not.toHaveBeenCalled();
    expect(getCachedRouteMock).not.toHaveBeenCalled();
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when revision calendar loading throws after workspace resolution", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardDueCountsByDayForUserMock.mockRejectedValueOnce(
      new Error("revision calendar offline")
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-05-01&to=2026-05-03"
      )
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "revision calendar offline",
    });
    expect(setCachedRouteMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when revision calendar cache persistence throws after loading", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
    getCachedRouteMock.mockResolvedValue(null);
    listFlashcardDueCountsByDayForUserMock.mockResolvedValue([
      {
        day: "2026-05-01",
        dueCount: 2,
        setId: "set-1",
        setTitle: "Closures",
      },
    ]);
    setCachedRouteMock.mockRejectedValueOnce(
      new Error("revision calendar cache offline")
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-05-01&to=2026-05-03"
      )
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "revision calendar cache offline",
    });
  });
});
