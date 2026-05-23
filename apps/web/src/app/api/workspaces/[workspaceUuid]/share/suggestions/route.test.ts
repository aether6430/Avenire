import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const workspaceShareSuggestionsRouteSource = readFileSync(
  resolve(import.meta.dirname, "route.ts"),
  "utf8"
);

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

  it("fails closed when session lookup throws before share suggestions access checks begin", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("share suggestions auth offline")
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/share/suggestions"
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "share suggestions auth offline",
    });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(listWorkspaceShareSuggestionsMock).not.toHaveBeenCalled();
  });

  it("fails closed when workspace access lookup throws before share suggestions loading begins", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "alex@example.com",
    });
    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("share suggestions access offline")
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/share/suggestions"
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "share suggestions access offline",
    });
    expect(listWorkspaceShareSuggestionsMock).not.toHaveBeenCalled();
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

  it("fails closed with an explicit suggestions error when lookup throws", async () => {
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      email: "alex@example.com",
    });
    listWorkspaceShareSuggestionsMock.mockRejectedValue(
      new Error("suggestions offline")
    );

    const response = await GET(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/share/suggestions?q=bea"
      ),
      { params: Promise.resolve({ workspaceUuid: "workspace-1" }) }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "suggestions offline",
    });
  });

  it("keeps workspace share suggestions routing on the shared share-route context instead of inlining auth/access preflight", () => {
    expect(workspaceShareSuggestionsRouteSource).toContain(
      "../workspace-share-route-context"
    );
    expect(workspaceShareSuggestionsRouteSource).toContain(
      "resolveWorkspaceShareRouteContext"
    );
    expect(workspaceShareSuggestionsRouteSource).not.toContain(
      "getSessionUser("
    );
    expect(workspaceShareSuggestionsRouteSource).not.toContain(
      "ensureWorkspaceAccessForUser("
    );
  });
});
