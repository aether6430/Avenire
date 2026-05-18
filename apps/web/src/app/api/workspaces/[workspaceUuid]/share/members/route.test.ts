import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  handleWorkspaceShareMembersDeleteMock,
  handleWorkspaceShareMembersGetMock,
  handleWorkspaceShareMembersPostMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  handleWorkspaceShareMembersDeleteMock: vi.fn(),
  handleWorkspaceShareMembersGetMock: vi.fn(),
  handleWorkspaceShareMembersPostMock: vi.fn(),
  loggerStub: {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
  },
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

vi.mock("./workspace-share-members-delete", () => ({
  handleWorkspaceShareMembersDelete: handleWorkspaceShareMembersDeleteMock,
}));

vi.mock("./workspace-share-members-get", () => ({
  handleWorkspaceShareMembersGet: handleWorkspaceShareMembersGetMock,
}));

vi.mock("./workspace-share-members-post", () => ({
  handleWorkspaceShareMembersPost: handleWorkspaceShareMembersPostMock,
}));

import { DELETE, GET, POST } from "./route";

describe("workspace share members route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createApiLoggerMock.mockReturnValue(loggerStub);
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      name: "Owner",
    });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    handleWorkspaceShareMembersPostMock.mockResolvedValue(
      Response.json({ status: "invited" })
    );
    handleWorkspaceShareMembersGetMock.mockResolvedValue(
      Response.json({ members: [] })
    );
    handleWorkspaceShareMembersDeleteMock.mockResolvedValue(
      Response.json({ status: "removed" })
    );
  });

  it("rejects unauthorized and forbidden access before delegating to share-member handlers", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const unauthorized = await GET(new Request("https://avenire.space"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });
    expect(unauthorized.status).toBe(401);
    await expect(unauthorized.json()).resolves.toEqual({
      error: "Unauthorized",
    });

    ensureWorkspaceAccessForUserMock.mockResolvedValueOnce(false);
    const forbidden = await POST(new Request("https://avenire.space"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });
    expect(forbidden.status).toBe(403);
    await expect(forbidden.json()).resolves.toEqual({
      error: "Forbidden",
    });
    expect(handleWorkspaceShareMembersPostMock).not.toHaveBeenCalled();
  });

  it("delegates GET, POST, and DELETE through the resolved workspace share context", async () => {
    const request = new Request("https://avenire.space");
    const context = {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    };

    const getResponse = await GET(request, context);
    const postResponse = await POST(request, context);
    const deleteResponse = await DELETE(request, context);

    for (const handlerMock of [
      handleWorkspaceShareMembersGetMock,
      handleWorkspaceShareMembersPostMock,
      handleWorkspaceShareMembersDeleteMock,
    ]) {
      expect(handlerMock).toHaveBeenCalledWith({
        apiLogger: loggerStub,
        request,
        user: {
          id: "user-1",
          name: "Owner",
        },
        workspaceUuid: "workspace-1",
      });
    }

    await expect(getResponse.json()).resolves.toEqual({ members: [] });
    await expect(postResponse.json()).resolves.toEqual({ status: "invited" });
    await expect(deleteResponse.json()).resolves.toEqual({ status: "removed" });
  });
});
