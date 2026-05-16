import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  listWorkspaceShareSuggestionsMock,
} = vi.hoisted(() => ({
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listWorkspaceShareSuggestionsMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceShareSuggestions: listWorkspaceShareSuggestionsMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/share/suggestions route", () => {
  beforeEach(() => {
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    listWorkspaceShareSuggestionsMock.mockReset();

    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/share/suggestions"
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "alex@example.com",
    });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/share/suggestions"
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns workspace share suggestions and trims the search query", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "alex@example.com",
    });
    listWorkspaceShareSuggestionsMock.mockResolvedValue([
      { email: "bea@example.com", userId: "user-2" },
    ]);

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/share/suggestions?q=%20%20bea%20%20"
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      suggestions: [{ email: "bea@example.com", userId: "user-2" }],
    });
    expect(listWorkspaceShareSuggestionsMock).toHaveBeenCalledWith({
      workspaceId: "workspace-1",
      userId: "user-1",
      userEmail: "alex@example.com",
      query: "bea",
      limit: 8,
    });
  });
});
