import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  afterMock,
  headersMock,
  listMembersMock,
  listWorkspacesForUserMock,
  resolveAppBaseUrlMock,
  sendWorkspaceShareEmailMock,
} = vi.hoisted(() => ({
  afterMock: vi.fn(async (callback: () => Promise<void> | void) => {
    await callback();
  }),
  headersMock: vi.fn(),
  listMembersMock: vi.fn(),
  listWorkspacesForUserMock: vi.fn(),
  resolveAppBaseUrlMock: vi.fn(),
  sendWorkspaceShareEmailMock: vi.fn(),
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      listMembers: listMembersMock,
    },
  },
  sendWorkspaceShareEmail: sendWorkspaceShareEmailMock,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("next/server", async () => {
  const actual =
    await vi.importActual<typeof import("next/server")>("next/server");
  return {
    ...actual,
    after: afterMock,
  };
});

vi.mock("@/lib/app-base-url", () => ({
  resolveAppBaseUrl: resolveAppBaseUrlMock,
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspacesForUser: listWorkspacesForUserMock,
}));

import { handleWorkspaceShareTeamPost } from "./workspace-share-team-post";

function createApiLoggerStub() {
  return {
    error: vi.fn(),
    featureUsed: vi.fn(),
    meter: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

describe("workspace share team post", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
    resolveAppBaseUrlMock.mockReturnValue("https://avenire.app");
    listWorkspacesForUserMock.mockResolvedValue([
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ]);
    listMembersMock.mockResolvedValue({
      members: [
        {
          role: "owner",
          user: {
            email: "owner@example.com",
            id: "user-1",
            name: "Owner",
          },
          userId: "user-1",
        },
        {
          role: "member",
          user: {
            email: "teammate@example.com",
            id: "user-2",
            name: "Teammate",
          },
          userId: "user-2",
        },
        {
          role: "member",
          user: {
            email: "peer@example.com",
            id: "user-3",
            name: "Peer",
          },
          userId: "user-3",
        },
      ],
    });
    sendWorkspaceShareEmailMock.mockResolvedValue(undefined);
  });

  it("rejects missing workspaces and non-admin users", async () => {
    listWorkspacesForUserMock.mockResolvedValueOnce([]);
    const missingLogger = createApiLoggerStub();
    const missingResponse = await handleWorkspaceShareTeamPost({
      apiLogger: missingLogger as never,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/share/team",
        {
          method: "POST",
        }
      ),
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });
    expect(missingResponse.status).toBe(404);
    expect(sendWorkspaceShareEmailMock).not.toHaveBeenCalled();
    expect(resolveAppBaseUrlMock).not.toHaveBeenCalled();

    listMembersMock.mockResolvedValueOnce({
      members: [
        {
          role: "member",
          user: {
            email: "owner@example.com",
            id: "user-1",
            name: "Owner",
          },
          userId: "user-1",
        },
      ],
    });
    const forbiddenLogger = createApiLoggerStub();
    const forbiddenResponse = await handleWorkspaceShareTeamPost({
      apiLogger: forbiddenLogger as never,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/share/team",
        {
          method: "POST",
        }
      ),
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });
    expect(forbiddenResponse.status).toBe(403);
    await expect(forbiddenResponse.json()).resolves.toEqual({
      error: "Only admins can share this workspace",
    });
    expect(sendWorkspaceShareEmailMock).not.toHaveBeenCalled();
    expect(resolveAppBaseUrlMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when team recipient lookup throws before queueing email work", async () => {
    const apiLogger = createApiLoggerStub();
    listMembersMock.mockRejectedValueOnce(new Error("members offline"));

    const response = await handleWorkspaceShareTeamPost({
      apiLogger: apiLogger as never,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/share/team",
        {
          method: "POST",
        }
      ),
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members offline",
    });
    expect(sendWorkspaceShareEmailMock).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
    expect(apiLogger.requestSucceeded).not.toHaveBeenCalled();
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "members offline",
      }),
      {
        workspaceUuid: "workspace-1",
      }
    );
  });

  it("queues team share emails and tolerates delivery failures in the async after hook", async () => {
    sendWorkspaceShareEmailMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("smtp down"));
    const logSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const apiLogger = createApiLoggerStub();

    const response = await handleWorkspaceShareTeamPost({
      apiLogger: apiLogger as never,
      request: new Request(
        "https://avenire.app/api/workspaces/workspace-1/share/team",
        {
          method: "POST",
        }
      ),
      user: { id: "user-1", name: "Owner" },
      workspaceUuid: "workspace-1",
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      queued: true,
      recipients: 2,
      workspaceUrl:
        "https://avenire.app/workspace/files/workspace-1/folder/root-1",
    });
    expect(sendWorkspaceShareEmailMock).toHaveBeenCalledTimes(2);
    expect(apiLogger.requestSucceeded).toHaveBeenCalledWith(200, {
      queued: true,
      recipients: 2,
      workspaceUuid: "workspace-1",
    });
    expect(apiLogger.error).toHaveBeenCalledWith(
      "error.integration",
      expect.objectContaining({
        action: "sendWorkspaceShareEmail",
        integration: "email",
      })
    );
    expect(apiLogger.meter).toHaveBeenCalledWith(
      "meter.share.created",
      expect.objectContaining({
        emailSentCount: 1,
        recipients: 2,
        resourceType: "workspace-team",
      })
    );
    logSpy.mockRestore();
  });
});
