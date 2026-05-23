import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  handleWorkspaceShareTeamPostMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  handleWorkspaceShareTeamPostMock: vi.fn(),
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

vi.mock("./workspace-share-team-post", () => ({
  handleWorkspaceShareTeamPost: handleWorkspaceShareTeamPostMock,
}));

const workspaceShareTeamRouteSource = readFileSync(
  resolve(import.meta.dirname, "route.ts"),
  "utf8"
);

import { POST } from "./route";

describe("workspace share team route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createApiLoggerMock.mockReturnValue(loggerStub);
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      name: "Owner",
    });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    handleWorkspaceShareTeamPostMock.mockResolvedValue(
      Response.json({ queued: true, recipients: 2 })
    );
  });

  it("rejects unauthorized and forbidden workspace team-share requests", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const unauthorized = await POST(new Request("https://avenire.space"), {
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
    expect(handleWorkspaceShareTeamPostMock).not.toHaveBeenCalled();
  });

  it("fails closed when top-level session lookup throws before team-share handling begins", async () => {
    getSessionUserMock.mockRejectedValue(
      new Error("workspace share team auth offline")
    );

    const response = await POST(new Request("https://avenire.space"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace share team auth offline",
    });
    expect(handleWorkspaceShareTeamPostMock).not.toHaveBeenCalled();
  });

  it("fails closed when workspace access lookup throws before team-share handling begins", async () => {
    ensureWorkspaceAccessForUserMock.mockRejectedValue(
      new Error("workspace share team access offline")
    );

    const response = await POST(new Request("https://avenire.space"), {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "workspace share team access offline",
    });
    expect(handleWorkspaceShareTeamPostMock).not.toHaveBeenCalled();
  });

  it("delegates successful team-share requests through the resolved route context", async () => {
    const request = new Request("https://avenire.space");
    const response = await POST(request, {
      params: Promise.resolve({ workspaceUuid: "workspace-1" }),
    });

    expect(handleWorkspaceShareTeamPostMock).toHaveBeenCalledWith({
      apiLogger: loggerStub,
      request,
      user: {
        id: "user-1",
        name: "Owner",
      },
      workspaceUuid: "workspace-1",
    });
    await expect(response.json()).resolves.toEqual({
      queued: true,
      recipients: 2,
    });
  });

  it("keeps workspace share team routing on the shared share-route context instead of inlining auth/access preflight", () => {
    expect(workspaceShareTeamRouteSource).toContain(
      "../workspace-share-route-context"
    );
    expect(workspaceShareTeamRouteSource).toContain(
      "resolveWorkspaceShareRouteContext"
    );
    expect(workspaceShareTeamRouteSource).not.toContain("getSessionUser(");
    expect(workspaceShareTeamRouteSource).not.toContain(
      "ensureWorkspaceAccessForUser("
    );
  });
});
