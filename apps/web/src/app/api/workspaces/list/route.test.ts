import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionUserMock, listWorkspacesForUserMock } = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspacesForUser: listWorkspacesForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/list route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    listWorkspacesForUserMock.mockReset();
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns workspaces for the session user", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspacesForUserMock.mockResolvedValue([
      { workspaceId: "workspace-1" },
      { workspaceId: "workspace-2" },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      workspaces: [
        { workspaceId: "workspace-1" },
        { workspaceId: "workspace-2" },
      ],
    });
  });

  it("maps lower-layer failures to stable json", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    listWorkspacesForUserMock.mockRejectedValue(new Error("database offline"));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "database offline",
    });
  });
});
