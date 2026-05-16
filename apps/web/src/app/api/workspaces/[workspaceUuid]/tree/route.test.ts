import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createRouteCacheKeyMock,
  ensureWorkspaceAccessForUserMock,
  getCachedRouteMock,
  getIngestionFlagsByFileIdsMock,
  getRouteCacheVersionMock,
  getSessionUserMock,
  listWorkspaceFilesMock,
  listWorkspaceFoldersMock,
  setCachedRouteMock,
} = vi.hoisted(() => ({
  createRouteCacheKeyMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getCachedRouteMock: vi.fn(),
  getIngestionFlagsByFileIdsMock: vi.fn(),
  getRouteCacheVersionMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  setCachedRouteMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  CACHE_NAMESPACES: {
    workspaceTree: "workspaceTree",
  },
}));

vi.mock("@/lib/file-data", () => ({
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
}));

vi.mock("@/lib/ingestion-data", () => ({
  getIngestionFlagsByFileIds: getIngestionFlagsByFileIdsMock,
}));

vi.mock("@/lib/route-cache", () => ({
  createRouteCacheKey: createRouteCacheKeyMock,
  getCachedRoute: getCachedRouteMock,
  getRouteCacheVersion: getRouteCacheVersionMock,
  setCachedRoute: setCachedRouteMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { GET } from "./route";

describe("/api/workspaces/[workspaceUuid]/tree route", () => {
  beforeEach(() => {
    createRouteCacheKeyMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    getCachedRouteMock.mockReset();
    getIngestionFlagsByFileIdsMock.mockReset();
    getRouteCacheVersionMock.mockReset();
    getSessionUserMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
    setCachedRouteMock.mockReset();

    createRouteCacheKeyMock.mockReturnValue("workspace-tree-cache-key");
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getRouteCacheVersionMock.mockResolvedValue("version-1");
    setCachedRouteMock.mockResolvedValue(undefined);
  });

  it("returns unauthorized when there is no session user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/tree"),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns forbidden when the user cannot access the workspace", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/tree"),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("returns cached payloads without loading files and folders again", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getCachedRouteMock.mockResolvedValue({
      files: [{ id: "file-1", isIngested: true, name: "A.md" }],
      folders: [{ id: "folder-1", name: "Folder 1" }],
    });

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/tree"),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-workspace-tree-cache")).toBe("hit");
    await expect(response.json()).resolves.toEqual({
      files: [{ id: "file-1", isIngested: true, name: "A.md" }],
      folders: [{ id: "folder-1", name: "Folder 1" }],
    });
    expect(listWorkspaceFoldersMock).not.toHaveBeenCalled();
    expect(listWorkspaceFilesMock).not.toHaveBeenCalled();
    expect(getIngestionFlagsByFileIdsMock).not.toHaveBeenCalled();
  });

  it("hydrates the tree payload on cache misses and caches the result", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getCachedRouteMock.mockResolvedValue(null);
    listWorkspaceFoldersMock.mockResolvedValue([
      { id: "folder-1", name: "Folder 1", parentId: null },
    ]);
    listWorkspaceFilesMock.mockResolvedValue([
      { folderId: "folder-1", id: "file-1", name: "A.md" },
      { folderId: "folder-1", id: "file-2", name: "B.pdf" },
    ]);
    getIngestionFlagsByFileIdsMock.mockResolvedValue({ "file-1": true });

    const response = await GET(
      new Request("http://localhost:3003/api/workspaces/workspace-1/tree"),
      {
        params: Promise.resolve({ workspaceUuid: "workspace-1" }),
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-workspace-tree-cache")).toBe("miss");
    await expect(response.json()).resolves.toEqual({
      files: [
        {
          folderId: "folder-1",
          id: "file-1",
          isIngested: true,
          name: "A.md",
        },
        {
          folderId: "folder-1",
          id: "file-2",
          isIngested: false,
          name: "B.pdf",
        },
      ],
      folders: [{ id: "folder-1", name: "Folder 1", parentId: null }],
    });
    expect(getIngestionFlagsByFileIdsMock).toHaveBeenCalledWith("workspace-1", [
      "file-1",
      "file-2",
    ]);
    expect(setCachedRouteMock).toHaveBeenCalledWith(
      "workspaceTree",
      "workspace-tree-cache-key",
      {
        files: [
          {
            folderId: "folder-1",
            id: "file-1",
            isIngested: true,
            name: "A.md",
          },
          {
            folderId: "folder-1",
            id: "file-2",
            isIngested: false,
            name: "B.pdf",
          },
        ],
        folders: [{ id: "folder-1", name: "Folder 1", parentId: null }],
      }
    );
  });
});
