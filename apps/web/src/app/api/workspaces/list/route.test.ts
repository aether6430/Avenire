import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  handleWorkspaceListRouteGetMock,
  listWorkspacesForUserMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  handleWorkspaceListRouteGetMock: vi.fn(),
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
    handleWorkspaceListRouteGetMock.mockReset();
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before workspace listing begins", async () => {
    getSessionUserMock.mockRejectedValue(
      new Error("workspace list auth offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace list auth offline",
    });
    expect(listWorkspacesForUserMock).not.toHaveBeenCalled();
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

  it("fails closed when the route wrapper handler throws before returning a response", async () => {
    vi.resetModules();
    handleWorkspaceListRouteGetMock.mockRejectedValueOnce(
      new Error("workspace list wrapper offline")
    );

    vi.doMock("./workspace-list-route-get", () => ({
      handleWorkspaceListRouteGet: handleWorkspaceListRouteGetMock,
    }));

    try {
      const { GET } = await import("./route");
      const response = await GET();

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "workspace list wrapper offline",
      });
    } finally {
      vi.doUnmock("./workspace-list-route-get");
      vi.resetModules();
    }
  });
});
