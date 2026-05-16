import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getSessionUserMock,
  listWorkspacesForUserMock,
  respondToInvitationForUserMock,
} = vi.hoisted(() => ({
  getSessionUserMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  respondToInvitationForUserMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspacesForUser: listWorkspacesForUserMock,
  respondToInvitationForUser: respondToInvitationForUserMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

describe("/api/workspaces/invitations/[invitationId] route", () => {
  beforeEach(() => {
    getSessionUserMock.mockReset();
    listWorkspacesForUserMock.mockReset();
    respondToInvitationForUserMock.mockReset();
  });

  it("returns unauthorized without a session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/invitations/invite-1", {
        body: JSON.stringify({ action: "accept" }),
        method: "POST",
      }),
      { params: Promise.resolve({ invitationId: "invite-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid invitation payloads", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/invitations/invite-1", {
        body: JSON.stringify({ action: "later" }),
        method: "POST",
      }),
      { params: Promise.resolve({ invitationId: "invite-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("accepts a normalized invitation action and hydrates the matching workspace", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    respondToInvitationForUserMock.mockResolvedValue({
      action: "accepted",
      ok: true,
      organizationId: "org-1",
      workspaceId: "workspace-1",
    });
    listWorkspacesForUserMock.mockResolvedValue([
      { workspaceId: "workspace-1", rootFolderId: "root-1" },
    ]);

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/invitations/invite-1", {
        body: JSON.stringify({ action: "  accept  " }),
        method: "POST",
      }),
      { params: Promise.resolve({ invitationId: " invite-1 " }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: "accepted",
      ok: true,
      organizationId: "org-1",
      workspaceId: "workspace-1",
      workspace: {
        workspaceId: "workspace-1",
        rootFolderId: "root-1",
      },
    });
    expect(respondToInvitationForUserMock).toHaveBeenCalledWith({
      action: "accept",
      invitationId: "invite-1",
      userEmail: "person@example.com",
      userId: "user-1",
    });
  });

  it("keeps accepted invitations successful when workspace hydration fails", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    respondToInvitationForUserMock.mockResolvedValue({
      action: "accepted",
      ok: true,
      organizationId: "org-1",
      workspaceId: "workspace-1",
    });
    listWorkspacesForUserMock.mockRejectedValue(new Error("db down"));

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/invitations/invite-1", {
        body: JSON.stringify({ action: "accept" }),
        method: "POST",
      }),
      { params: Promise.resolve({ invitationId: "invite-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      action: "accepted",
      ok: true,
      organizationId: "org-1",
      workspaceId: "workspace-1",
      workspace: null,
    });
  });

  it("returns lower-layer invitation errors as client errors", async () => {
    getSessionUserMock.mockResolvedValue({
      email: "person@example.com",
      id: "user-1",
    });
    respondToInvitationForUserMock.mockResolvedValue({
      error: "Invitation not found",
      ok: false,
    });

    const response = await POST(
      new Request("http://localhost:3003/api/workspaces/invitations/invite-1", {
        body: JSON.stringify({ action: "decline" }),
        method: "POST",
      }),
      { params: Promise.resolve({ invitationId: "invite-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invitation not found",
    });
  });
});
