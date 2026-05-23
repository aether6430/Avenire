import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findAuthUserByEmailMock,
  listWorkspaceMembersMock,
  listMembersMock,
  listWorkspacesForUserMock,
  createWorkspaceInvitationByEmailMock,
  removeMemberMock,
  sendWorkspaceShareEmailMock,
  updateWorkspaceMemberRoleForUserMock,
  resolveAppBaseUrlMock,
  headersMock,
} = vi.hoisted(() => ({
  createWorkspaceInvitationByEmailMock: vi.fn(),
  findAuthUserByEmailMock: vi.fn(),
  headersMock: vi.fn(),
  listMembersMock: vi.fn(),
  listWorkspaceMembersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  removeMemberMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
  sendWorkspaceShareEmailMock: vi.fn(),
  updateWorkspaceMemberRoleForUserMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      listMembers: listMembersMock,
      removeMember: removeMemberMock,
    },
  },
  sendWorkspaceShareEmail: sendWorkspaceShareEmailMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("@/lib/app-base-url", () => ({
  resolveAppBaseUrl: resolveAppBaseUrlMock,
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceInvitationByEmail: createWorkspaceInvitationByEmailMock,
  findAuthUserByEmail: findAuthUserByEmailMock,
  listWorkspaceMembers: listWorkspaceMembersMock,
  listWorkspacesForUser: listWorkspacesForUserMock,
  updateWorkspaceMemberRoleForUser: updateWorkspaceMemberRoleForUserMock,
}));

import { handleWorkspaceShareMembersDelete } from "./workspace-share-members-delete";
import { handleWorkspaceShareMembersGet } from "./workspace-share-members-get";
import { handleWorkspaceShareMembersPost } from "./workspace-share-members-post";

function createApiLoggerStub() {
  return {
    error: vi.fn(),
    featureUsed: vi.fn(),
    meter: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function createWorkspaceSummary() {
  return {
    name: "Aveniri",
    organizationId: "org-1",
    rootFolderId: "root-1",
    workspaceId: "workspace-1",
  };
}

describe("workspace share members handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    resolveAppBaseUrlMock.mockReturnValue("https://avenire.app");
    listWorkspacesForUserMock.mockResolvedValue([createWorkspaceSummary()]);
    listMembersMock.mockResolvedValue({
      members: [
        {
          id: "member-1",
          role: "owner",
          user: {
            email: "owner@example.com",
            id: "user-1",
            name: "Owner",
          },
          userId: "user-1",
        },
        {
          id: "member-2",
          role: "member",
          user: {
            email: "teammate@example.com",
            id: "user-2",
            name: "Teammate",
          },
          userId: "user-2",
        },
      ],
    });
    listWorkspaceMembersMock.mockResolvedValue([
      {
        role: "owner",
        userId: "user-1",
      },
      {
        role: "member",
        userId: "user-2",
      },
    ]);
    createWorkspaceInvitationByEmailMock.mockResolvedValue({
      invitationId: "invite-1",
      status: "invited",
    });
    findAuthUserByEmailMock.mockResolvedValue({
      email: "invitee@example.com",
      id: "user-3",
      name: "Invitee",
    });
    updateWorkspaceMemberRoleForUserMock.mockResolvedValue({
      status: "updated",
    });
    sendWorkspaceShareEmailMock.mockResolvedValue(undefined);
    removeMemberMock.mockResolvedValue({
      id: "member-2",
    });
  });

  it("lists workspace members and adds a fallback user match for unmatched email queries", async () => {
    const apiLogger = createApiLoggerStub();

    const response = await handleWorkspaceShareMembersGet({
      apiLogger: apiLogger as never,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/share/members?q=invitee@example.com"
      ),
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });

    expect(listMembersMock).toHaveBeenCalledWith({
      headers: await headersMock.mock.results[0]?.value,
      query: {
        organizationId: "org-1",
      },
    });
    await expect(response.json()).resolves.toEqual({
      members: [
        {
          avatar: null,
          email: "invitee@example.com",
          id: null,
          name: "Invitee",
          role: "external",
          userId: "user-3",
        },
      ],
    });
    expect(apiLogger.requestSucceeded).toHaveBeenCalledWith(200, {
      memberCount: 1,
      workspaceUuid: "workspace-1",
    });
  });

  it("returns a 500 json error when workspace-member lookup throws before success logging", async () => {
    listMembersMock.mockRejectedValueOnce(new Error("members offline"));
    const apiLogger = createApiLoggerStub();

    const response = await handleWorkspaceShareMembersGet({
      apiLogger: apiLogger as never,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/share/members?q=invitee@example.com"
      ),
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members offline",
    });
    expect(findAuthUserByEmailMock).not.toHaveBeenCalled();
    expect(apiLogger.requestSucceeded).not.toHaveBeenCalled();
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "members offline",
      }),
      { workspaceUuid: "workspace-1" }
    );
  });

  it("rejects non-admin member invites and handles invalid-email plus already-member updates", async () => {
    listWorkspaceMembersMock.mockResolvedValueOnce([
      {
        role: "member",
        userId: "user-1",
      },
    ]);
    const forbiddenLogger = createApiLoggerStub();
    const forbiddenResponse = await handleWorkspaceShareMembersPost({
      apiLogger: forbiddenLogger as never,
      request: {
        json: vi.fn().mockResolvedValue({ email: "person@example.com" }),
      } as never,
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });
    expect(forbiddenResponse.status).toBe(403);

    createWorkspaceInvitationByEmailMock.mockResolvedValueOnce({
      status: "invalid-email",
    });
    const invalidEmailLogger = createApiLoggerStub();
    const invalidEmailResponse = await handleWorkspaceShareMembersPost({
      apiLogger: invalidEmailLogger as never,
      request: {
        json: vi.fn().mockResolvedValue({ email: "person@example.com" }),
      } as never,
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });
    expect(invalidEmailResponse.status).toBe(400);
    await expect(invalidEmailResponse.json()).resolves.toEqual({
      error: "Invalid email",
    });

    createWorkspaceInvitationByEmailMock.mockResolvedValueOnce({
      status: "already-member",
    });
    const updatedLogger = createApiLoggerStub();
    const updatedResponse = await handleWorkspaceShareMembersPost({
      apiLogger: updatedLogger as never,
      request: {
        json: vi.fn().mockResolvedValue({
          email: "invitee@example.com",
          role: "admin",
        }),
      } as never,
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });
    expect(updateWorkspaceMemberRoleForUserMock).toHaveBeenCalledWith({
      role: "admin",
      userId: "user-3",
      workspaceId: "workspace-1",
    });
    expect(updatedResponse.status).toBe(200);
    await expect(updatedResponse.json()).resolves.toEqual({
      role: "admin",
      status: "updated",
    });
  });

  it("returns a 500 json error when member invitation creation throws before email delivery", async () => {
    createWorkspaceInvitationByEmailMock.mockRejectedValueOnce(
      new Error("invite service offline")
    );
    const apiLogger = createApiLoggerStub();

    const response = await handleWorkspaceShareMembersPost({
      apiLogger: apiLogger as never,
      request: {
        json: vi.fn().mockResolvedValue({
          email: "invitee@example.com",
          role: "member",
        }),
      } as never,
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "invite service offline",
    });
    expect(sendWorkspaceShareEmailMock).not.toHaveBeenCalled();
    expect(resolveAppBaseUrlMock).not.toHaveBeenCalled();
    expect(apiLogger.requestSucceeded).not.toHaveBeenCalled();
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "invite service offline",
      }),
      { workspaceUuid: "workspace-1" }
    );
  });

  it("invites members, tolerates share-email failures, and removes members with explicit failures", async () => {
    sendWorkspaceShareEmailMock.mockRejectedValueOnce(new Error("smtp down"));
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const inviteLogger = createApiLoggerStub();
    const inviteResponse = await handleWorkspaceShareMembersPost({
      apiLogger: inviteLogger as never,
      request: {
        json: vi.fn().mockResolvedValue({
          email: "  invitee@example.com  ",
          role: "member",
        }),
      } as never,
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });
    expect(inviteResponse.status).toBe(200);
    await expect(inviteResponse.json()).resolves.toEqual({
      emailSent: false,
      invitationId: "invite-1",
      member: {
        email: "invitee@example.com",
        id: "user-3",
        name: "Invitee",
      },
      role: "member",
      status: "invited",
      workspaceUrl:
        "https://avenire.app/workspace/files/workspace-1/folder/root-1",
    });
    expect(inviteLogger.error).toHaveBeenCalledWith(
      "error.integration",
      expect.objectContaining({
        action: "sendWorkspaceShareEmail",
        integration: "email",
      })
    );
    logSpy.mockRestore();

    listMembersMock.mockResolvedValueOnce({
      members: [
        {
          id: "member-1",
          role: "owner",
          user: {
            email: "owner@example.com",
            id: "user-1",
            name: "Owner",
          },
          userId: "user-1",
        },
        {
          id: "member-2",
          role: "member",
          user: {
            email: "teammate@example.com",
            id: "user-2",
            name: "Teammate",
          },
          userId: "user-2",
        },
      ],
    });
    removeMemberMock.mockRejectedValueOnce(new Error("cannot remove"));
    const deleteLogger = createApiLoggerStub();
    const deleteResponse = await handleWorkspaceShareMembersDelete({
      apiLogger: deleteLogger as never,
      request: {
        json: vi.fn().mockResolvedValue({ memberIdOrEmail: "member-2" }),
      } as never,
      user: { id: "user-1" },
      workspaceUuid: "workspace-1",
    });
    expect(deleteResponse.status).toBe(500);
    await expect(deleteResponse.json()).resolves.toEqual({
      error: "cannot remove",
    });
    expect(deleteLogger.requestSucceeded).not.toHaveBeenCalled();
  });
});
