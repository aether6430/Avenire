import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  handleWorkspaceInvitationsRouteGetMock,
  listPendingInvitationsForEmailMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  handleWorkspaceInvitationsRouteGetMock: vi.fn(),
  listPendingInvitationsForEmailMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  listPendingInvitationsForEmail: listPendingInvitationsForEmailMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/invitations route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    handleWorkspaceInvitationsRouteGetMock.mockReset();
    listPendingInvitationsForEmailMock.mockReset();
  });

  it("returns unauthorized without a session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before invitation loading begins", async () => {
    getSessionUserMock.mockRejectedValue(
      new Error("workspace invitations auth offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace invitations auth offline",
    });
    expect(listPendingInvitationsForEmailMock).not.toHaveBeenCalled();
  });

  it("returns pending invitations for the session email", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    listPendingInvitationsForEmailMock.mockResolvedValue([{ id: "invite-1" }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      invitations: [{ id: "invite-1" }],
    });
    expect(listPendingInvitationsForEmailMock).toHaveBeenCalledWith(
      "person@example.com"
    );
  });

  it("maps invitation loading failures to stable json", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    listPendingInvitationsForEmailMock.mockRejectedValue(
      new Error("database offline")
    );

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "database offline",
    });
  });

  it("fails closed when the route wrapper handler throws before returning a response", async () => {
    vi.resetModules();
    handleWorkspaceInvitationsRouteGetMock.mockRejectedValueOnce(
      new Error("workspace invitations wrapper offline")
    );

    vi.doMock("./workspace-invitations-route-get", () => ({
      handleWorkspaceInvitationsRouteGet:
        handleWorkspaceInvitationsRouteGetMock,
    }));

    try {
      const { GET } = await import("./route");
      const response = await GET();

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "workspace invitations wrapper offline",
      });
    } finally {
      vi.doUnmock("./workspace-invitations-route-get");
      vi.resetModules();
    }
  });
});
