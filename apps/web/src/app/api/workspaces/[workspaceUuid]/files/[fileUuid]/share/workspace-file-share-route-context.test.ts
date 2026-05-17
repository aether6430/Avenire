import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  getFileAssetByIdMock,
  getSessionUserMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  loggerStub: {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
  },
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { resolveWorkspaceFileShareRouteContext } from "./workspace-file-share-route-context";

function createInput() {
  return {
    params: Promise.resolve({
      fileUuid: "file-1",
      workspaceUuid: "workspace-1",
    }),
    request: new Request(
      "https://avenire.app/api/workspaces/workspace-1/files/file-1/share"
    ),
    route: "/api/workspaces/[workspaceUuid]/files/[fileUuid]/share/[resource]",
  };
}

describe("workspace file share route context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createApiLoggerMock.mockReturnValue(loggerStub);
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      name: "Owner",
    });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      name: "Plan.md",
    });
  });

  it("rejects unauthorized requests before workspace access checks", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const result = await resolveWorkspaceFileShareRouteContext(createInput());

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({
        error: "Unauthorized",
      });
    }
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
  });

  it("rejects forbidden users and missing files", async () => {
    ensureWorkspaceAccessForUserMock.mockResolvedValueOnce(false);

    const forbidden = await resolveWorkspaceFileShareRouteContext(
      createInput()
    );
    expect("response" in forbidden).toBe(true);
    if ("response" in forbidden) {
      expect(forbidden.response.status).toBe(403);
      await expect(forbidden.response.json()).resolves.toEqual({
        error: "Forbidden",
      });
    }

    getFileAssetByIdMock.mockResolvedValueOnce(null);
    const missingFile = await resolveWorkspaceFileShareRouteContext(
      createInput()
    );
    expect("response" in missingFile).toBe(true);
    if ("response" in missingFile) {
      expect(missingFile.response.status).toBe(404);
      await expect(missingFile.response.json()).resolves.toEqual({
        error: "File not found",
      });
    }
  });

  it("returns the hydrated context for accessible files", async () => {
    const result = await resolveWorkspaceFileShareRouteContext(createInput());

    expect("response" in result).toBe(false);
    if ("response" in result) {
      throw new Error("Expected a successful context.");
    }

    expect(result).toMatchObject({
      file: expect.objectContaining({
        id: "file-1",
      }),
      fileUuid: "file-1",
      user: expect.objectContaining({
        id: "user-1",
      }),
      workspaceUuid: "workspace-1",
    });
    expect(loggerStub.requestStarted).toHaveBeenCalledTimes(1);
  });
});
