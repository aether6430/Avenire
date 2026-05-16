import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  authGetSessionMock,
  headersMock,
  listFlashcardDueCountsByDayForUserMock,
  resolveWorkspaceForUserMock,
} = vi.hoisted(() => ({
  authGetSessionMock: vi.fn(),
  headersMock: vi.fn(),
  listFlashcardDueCountsByDayForUserMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
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

vi.mock("@/lib/flashcards", () => ({
  listFlashcardDueCountsByDayForUser: listFlashcardDueCountsByDayForUserMock,
}));

import { GET } from "./route";

describe("/api/flashcards/revision-calendar route", () => {
  beforeEach(() => {
    authGetSessionMock.mockReset();
    headersMock.mockReset();
    listFlashcardDueCountsByDayForUserMock.mockReset();
    resolveWorkspaceForUserMock.mockReset();

    headersMock.mockResolvedValue(new Headers());
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

    response = await GET(
      new Request(
        "http://localhost:3003/api/flashcards/revision-calendar?from=2026-05-04&to=2026-05-03"
      )
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid date range",
    });
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
  });

  it("loads due rows and groups them by day", async () => {
    authGetSessionMock.mockResolvedValue({
      session: { activeOrganizationId: "org-1" },
      user: { id: "user-1" },
    });
    resolveWorkspaceForUserMock.mockResolvedValue({
      workspaceId: "workspace-1",
    });
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
    expect(listFlashcardDueCountsByDayForUserMock).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      new Date("2026-05-01T00:00:00.000Z"),
      new Date("2026-05-03T00:00:00.000Z")
    );
  });
});
