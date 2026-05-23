import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const workspaceShareMembersRouteSource = readFileSync(
  resolve(import.meta.dirname, "route.ts"),
  "utf8"
);
const workspaceShareRouteContextSource = readFileSync(
  resolve(import.meta.dirname, "../workspace-share-route-context.ts"),
  "utf8"
);

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

  it("fails closed when top-level session lookup throws before share-member handlers run", async () => {
    const request = new Request("https://avenire.space");
    const context = {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    };

    getSessionUserMock.mockRejectedValueOnce(new Error("members auth offline"));
    let response = await GET(request, context);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members auth offline",
    });
    expect(handleWorkspaceShareMembersGetMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("members invite auth offline")
    );
    response = await POST(request, context);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members invite auth offline",
    });
    expect(handleWorkspaceShareMembersPostMock).not.toHaveBeenCalled();

    getSessionUserMock.mockRejectedValueOnce(
      new Error("members remove auth offline")
    );
    response = await DELETE(request, context);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members remove auth offline",
    });
    expect(handleWorkspaceShareMembersDeleteMock).not.toHaveBeenCalled();
  });

  it("fails closed when workspace access lookup throws before share-member handlers run", async () => {
    const request = new Request("https://avenire.space");
    const context = {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    };

    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("members access offline")
    );
    let response = await GET(request, context);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members access offline",
    });
    expect(handleWorkspaceShareMembersGetMock).not.toHaveBeenCalled();

    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("members invite access offline")
    );
    response = await POST(request, context);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members invite access offline",
    });
    expect(handleWorkspaceShareMembersPostMock).not.toHaveBeenCalled();

    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("members remove access offline")
    );
    response = await DELETE(request, context);
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "members remove access offline",
    });
    expect(handleWorkspaceShareMembersDeleteMock).not.toHaveBeenCalled();
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

  it("keeps workspace share members routing on the shared share-route context instead of inlining auth/access preflight", () => {
    expect(workspaceShareMembersRouteSource).toContain(
      "../workspace-share-route-context"
    );
    expect(workspaceShareMembersRouteSource).toContain(
      "resolveWorkspaceShareRouteContext"
    );
    expect(workspaceShareMembersRouteSource).not.toContain("getSessionUser(");
    expect(workspaceShareMembersRouteSource).not.toContain(
      "ensureWorkspaceAccessForUser("
    );

    expect(workspaceShareRouteContextSource).toContain("createApiLogger");
    expect(workspaceShareRouteContextSource).toContain("getSessionUser");
    expect(workspaceShareRouteContextSource).toContain(
      "ensureWorkspaceAccessForUser"
    );
  });
});
