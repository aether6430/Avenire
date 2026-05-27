import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFolderMock,
  duplicateSharedFileIntoWorkspaceMock,
  getFolderWithAncestorsMock,
  listWorkspaceFilesMock,
  listWorkspaceFoldersMock,
} = vi.hoisted(() => ({
  createFolderMock: vi.fn(),
  duplicateSharedFileIntoWorkspaceMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  createFolder: createFolderMock,
  getFolderWithAncestors: getFolderWithAncestorsMock,
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
}));

vi.mock("./shared-resource-duplicate-file", () => ({
  duplicateSharedFileIntoWorkspace: duplicateSharedFileIntoWorkspaceMock,
}));

import { duplicateSharedFolderIntoWorkspace } from "./shared-resource-duplicate-folder";

describe("shared resource duplicate folder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: {
        id: "source-root",
      },
    });
    listWorkspaceFoldersMock
      .mockResolvedValueOnce([
        { id: "source-root", name: "Docs", parentId: null },
        { id: "source-child", name: "Sub", parentId: "source-root" },
      ])
      .mockResolvedValueOnce([]);
    listWorkspaceFilesMock.mockResolvedValue([
      { folderId: "source-root", id: "file-root" },
      { folderId: "source-child", id: "file-child" },
    ]);
    createFolderMock
      .mockResolvedValueOnce({
        id: "target-root",
        name: "Docs",
        parentId: "target-parent",
      })
      .mockResolvedValueOnce({
        id: "target-child",
        name: "Sub",
        parentId: "target-root",
      });
    duplicateSharedFileIntoWorkspaceMock.mockResolvedValue(
      Response.json({ copied: true })
    );
  });

  it("fails closed when the source tree or source folder cannot be loaded", async () => {
    getFolderWithAncestorsMock.mockResolvedValueOnce(null);

    const missingTree = await duplicateSharedFolderIntoWorkspace({
      buildRoute: (folderId) =>
        `/workspace/files/workspace-1/folder/${folderId}`,
      folderId: "source-root",
      sourceWorkspaceId: "workspace-source",
      targetRootFolderId: "target-parent",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });
    expect(missingTree.status).toBe(500);

    getFolderWithAncestorsMock.mockResolvedValueOnce({
      folder: {
        id: "source-root",
      },
    });
    listWorkspaceFoldersMock.mockReset();
    listWorkspaceFoldersMock
      .mockResolvedValueOnce([{ id: "other", name: "Other", parentId: null }])
      .mockResolvedValueOnce([]);
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFilesMock.mockResolvedValue([]);

    const missingFolder = await duplicateSharedFolderIntoWorkspace({
      buildRoute: (folderId) =>
        `/workspace/files/workspace-1/folder/${folderId}`,
      folderId: "source-root",
      sourceWorkspaceId: "workspace-source",
      targetRootFolderId: "target-parent",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });
    expect(missingFolder.status).toBe(500);
  });

  it("duplicates folder trees, clones descendant folders, and copies files into the cloned destinations", async () => {
    const response = await duplicateSharedFolderIntoWorkspace({
      buildRoute: (folderId) =>
        `/workspace/files/workspace-1/folder/${folderId}`,
      folderId: "source-root",
      sourceWorkspaceId: "workspace-source",
      targetRootFolderId: "target-parent",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });

    expect(createFolderMock).toHaveBeenNthCalledWith(
      1,
      "workspace-1",
      "target-parent",
      "Docs",
      "user-1"
    );
    expect(createFolderMock).toHaveBeenNthCalledWith(
      2,
      "workspace-1",
      "target-root",
      "Sub",
      "user-1"
    );
    expect(duplicateSharedFileIntoWorkspaceMock).toHaveBeenCalledTimes(2);
    expect(duplicateSharedFileIntoWorkspaceMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        fileId: "file-root",
        targetFolderId: "target-root",
      })
    );
    expect(duplicateSharedFileIntoWorkspaceMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        fileId: "file-child",
        targetFolderId: "target-child",
      })
    );
    const buildRoute = duplicateSharedFileIntoWorkspaceMock.mock.calls[0]?.[0]
      ?.buildRoute as (input: { fileId: string; folderId: string }) => string;
    expect(
      buildRoute({
        fileId: "copy-file",
        folderId: "target-child",
      })
    ).toBe("/workspace/files/workspace-1/folder/target-child?file=copy-file");
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      copied: true,
      route: "/workspace/files/workspace-1/folder/target-root",
    });
  });

  it("fails closed when the root destination folder cannot be created", async () => {
    createFolderMock.mockReset();
    createFolderMock.mockResolvedValueOnce(null);

    const response = await duplicateSharedFolderIntoWorkspace({
      buildRoute: (folderId) =>
        `/workspace/files/workspace-1/folder/${folderId}`,
      folderId: "source-root",
      sourceWorkspaceId: "workspace-source",
      targetRootFolderId: "target-parent",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to copy folder.",
    });
  });
});
