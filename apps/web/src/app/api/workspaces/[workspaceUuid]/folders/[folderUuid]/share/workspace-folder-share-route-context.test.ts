import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  getFolderWithAncestorsMock,
  getSessionUserMock,
  loggerStub,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  loggerStub: {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
  },
}));

vi.mock("@/lib/file-data", () => ({
  getFolderWithAncestors: getFolderWithAncestorsMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { resolveWorkspaceFolderShareRouteContext } from "./workspace-folder-share-route-context";

function createInput() {
  return {
    params: Promise.resolve({
      folderUuid: "folder-1",
      workspaceUuid: "workspace-1",
    }),
    request: new Request(
      "https://avenire.app/api/workspaces/workspace-1/folders/folder-1/share"
    ),
    route:
      "/api/workspaces/[workspaceUuid]/folders/[folderUuid]/share/[resource]",
  };
}

describe("workspace folder share route context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createApiLoggerMock.mockReturnValue(loggerStub);
    getSessionUserMock.mockResolvedValue({
      id: "user-1",
      name: "Owner",
    });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: {
        id: "folder-1",
        name: "Docs",
      },
    });
  });

  it("rejects unauthorized requests before workspace access checks", async () => {
    getSessionUserMock.mockResolvedValueOnce(null);

    const result = await resolveWorkspaceFolderShareRouteContext(createInput());

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(401);
      await expect(result.response.json()).resolves.toEqual({
        error: "Unauthorized",
      });
    }
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
  });

  it("fails closed when shared folder share context lookup throws before the handler runs", async () => {
    getSessionUserMock.mockRejectedValueOnce(
      new Error("folder share auth offline")
    );

    const result = await resolveWorkspaceFolderShareRouteContext(createInput());

    expect("response" in result).toBe(true);
    if ("response" in result) {
      expect(result.response.status).toBe(500);
      await expect(result.response.json()).resolves.toEqual({
        error: "folder share auth offline",
      });
    }
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
  });

  it("rejects forbidden users and missing folders", async () => {
    ensureWorkspaceAccessForUserMock.mockResolvedValueOnce(false);

    const forbidden = await resolveWorkspaceFolderShareRouteContext(
      createInput()
    );
    expect("response" in forbidden).toBe(true);
    if ("response" in forbidden) {
      expect(forbidden.response.status).toBe(403);
      await expect(forbidden.response.json()).resolves.toEqual({
        error: "Forbidden",
      });
    }

    getFolderWithAncestorsMock.mockResolvedValueOnce(null);
    const missingFolder = await resolveWorkspaceFolderShareRouteContext(
      createInput()
    );
    expect("response" in missingFolder).toBe(true);
    if ("response" in missingFolder) {
      expect(missingFolder.response.status).toBe(404);
      await expect(missingFolder.response.json()).resolves.toEqual({
        error: "Folder not found",
      });
    }
  });

  it("returns the hydrated context for accessible folders", async () => {
    const result = await resolveWorkspaceFolderShareRouteContext(createInput());

    expect("response" in result).toBe(false);
    if ("response" in result) {
      throw new Error("Expected a successful context.");
    }

    expect(result).toMatchObject({
      folder: expect.objectContaining({
        folder: expect.objectContaining({
          id: "folder-1",
        }),
      }),
      folderUuid: "folder-1",
      user: expect.objectContaining({
        id: "user-1",
      }),
      workspaceUuid: "workspace-1",
    });
    expect(loggerStub.requestStarted).toHaveBeenCalledTimes(1);
  });
});
