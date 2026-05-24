import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFolderMock,
  createWorkspaceNoteFileMock,
  getFileAssetByIdMock,
  getFolderWithAncestorsMock,
  getNoteContentMock,
  invalidateWorkspaceReadCachesMock,
  isSharedFilesVirtualFolderIdMock,
  isMarkdownFileRecordMock,
  listWorkspaceFilesMock,
  listWorkspaceFoldersMock,
  publishFilesInvalidationEventMock,
  registerFileAssetMock,
} = vi.hoisted(() => ({
  createFolderMock: vi.fn(),
  createWorkspaceNoteFileMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getFolderWithAncestorsMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  listWorkspaceFoldersMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  registerFileAssetMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  createFolder: createFolderMock,
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  getFileAssetById: getFileAssetByIdMock,
  getFolderWithAncestors: getFolderWithAncestorsMock,
  getNoteContent: getNoteContentMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  listWorkspaceFiles: listWorkspaceFilesMock,
  listWorkspaceFolders: listWorkspaceFoldersMock,
  registerFileAsset: registerFileAssetMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

import { handleDuplicateWorkspaceFile } from "./workspace-item-duplicate-file";
import { handleDuplicateWorkspaceFolder } from "./workspace-item-duplicate-folder";

const WORKSPACE_UUID = "919ed32c-fb5a-4fe1-98aa-db048a6e71cc";

describe("workspace item duplicate handlers", () => {
  beforeEach(() => {
    createFolderMock.mockReset();
    createWorkspaceNoteFileMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getFolderWithAncestorsMock.mockReset();
    getNoteContentMock.mockReset();
    invalidateWorkspaceReadCachesMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    registerFileAssetMock.mockReset();

    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
  });

  it("invalidates workspace read caches after duplicating a note file", async () => {
    getFileAssetByIdMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-1",
      name: "Welcome.md",
      storageUrl: "https://example.test/welcome.md",
    });
    getNoteContentMock.mockResolvedValue({ content: "# Welcome" });
    isMarkdownFileRecordMock.mockReturnValue(true);
    listWorkspaceFilesMock.mockResolvedValue([
      { folderId: "folder-1", name: "Welcome.md" },
    ]);
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: { id: "folder-1" },
    });
    createWorkspaceNoteFileMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-copy",
      name: "Welcome (1).md",
    });

    const response = await handleDuplicateWorkspaceFile({
      fileId: "file-1",
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      file: {
        folderId: "folder-1",
        id: "file-copy",
        name: "Welcome (1).md",
      },
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      fileId: "file-copy",
      reason: "file.created",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("invalidates workspace read caches after duplicating a folder", async () => {
    getFolderWithAncestorsMock.mockResolvedValue({
      folder: { id: "folder-1" },
    });
    listWorkspaceFoldersMock.mockResolvedValue([
      { id: "folder-1", name: "Course", parentId: "root" },
    ]);
    listWorkspaceFilesMock.mockResolvedValue([]);
    createFolderMock.mockResolvedValue({
      id: "folder-copy",
      name: "Course (1)",
      parentId: "root",
    });

    const response = await handleDuplicateWorkspaceFolder({
      folderId: "folder-1",
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      folder: {
        id: "folder-copy",
        name: "Course (1)",
        parentId: "root",
      },
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      folderId: "folder-copy",
      reason: "folder.created",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });

  it("fails closed when duplicate targets point at Shared Files or a missing folder", async () => {
    getFileAssetByIdMock.mockResolvedValue({
      folderId: "folder-1",
      id: "file-1",
      name: "Welcome.md",
      storageUrl: "https://example.test/welcome.md",
    });
    isSharedFilesVirtualFolderIdMock.mockImplementation(
      (folderId: string) => folderId === "shared-folder"
    );

    let response = await handleDuplicateWorkspaceFile({
      fileId: "file-1",
      parentId: "shared-folder",
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Cannot create items in Shared Files",
    });
    expect(getFolderWithAncestorsMock).not.toHaveBeenCalled();
    expect(createWorkspaceNoteFileMock).not.toHaveBeenCalled();
    expect(registerFileAssetMock).not.toHaveBeenCalled();

    getFolderWithAncestorsMock.mockResolvedValueOnce(null);
    response = await handleDuplicateWorkspaceFolder({
      folderId: "folder-1",
      parentId: "folder-missing",
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Folder not found",
    });
    expect(createFolderMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });

  it("fails closed when route-level session lookup throws before duplicate handling begins", async () => {
    vi.resetModules();

    const ensureWorkspaceAccessForUserMock = vi.fn();
    const getSessionUserMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("duplicate auth offline"));
    const handleDuplicateWorkspaceFileMock = vi.fn();
    const handleDuplicateWorkspaceFolderMock = vi.fn();

    vi.doMock("@/lib/workspace", () => ({
      ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("./workspace-item-duplicate-file", () => ({
      handleDuplicateWorkspaceFile: handleDuplicateWorkspaceFileMock,
    }));
    vi.doMock("./workspace-item-duplicate-folder", () => ({
      handleDuplicateWorkspaceFolder: handleDuplicateWorkspaceFolderMock,
    }));

    try {
      const { POST } = await import("./route");

      const response = await POST(
        new Request(
          `http://localhost:3003/api/workspaces/${WORKSPACE_UUID}/items/duplicate`,
          {
            method: "POST",
            body: JSON.stringify({
              id: "file-1",
              kind: "file",
            }),
          }
        ),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(500);
      await expect(response.json()).resolves.toEqual({
        error: "duplicate auth offline",
      });
      expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
      expect(handleDuplicateWorkspaceFileMock).not.toHaveBeenCalled();
      expect(handleDuplicateWorkspaceFolderMock).not.toHaveBeenCalled();
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock("./workspace-item-duplicate-file");
      vi.doUnmock("./workspace-item-duplicate-folder");
      vi.resetModules();
    }
  });

  it("delegates file and folder duplicate requests through the real route wrapper", async () => {
    vi.resetModules();

    const ensureWorkspaceAccessForUserMock = vi.fn().mockResolvedValue(true);
    const getSessionUserMock = vi.fn().mockResolvedValue({ id: "user-1" });
    const handleDuplicateWorkspaceFileMock = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ file: { id: "file-copy" } }, { status: 201 })
      );
    const handleDuplicateWorkspaceFolderMock = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ folder: { id: "folder-copy" } }, { status: 201 })
      );

    vi.doMock("@/lib/workspace", () => ({
      ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("./workspace-item-duplicate-file", () => ({
      handleDuplicateWorkspaceFile: handleDuplicateWorkspaceFileMock,
    }));
    vi.doMock("./workspace-item-duplicate-folder", () => ({
      handleDuplicateWorkspaceFolder: handleDuplicateWorkspaceFolderMock,
    }));

    try {
      const { POST } = await import("./route");

      let response = await POST(
        new Request(
          `http://localhost:3003/api/workspaces/${WORKSPACE_UUID}/items/duplicate`,
          {
            method: "POST",
            body: JSON.stringify({
              id: "file-1",
              kind: "file",
              parentId: "folder-2",
            }),
          }
        ),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(201);
      expect(ensureWorkspaceAccessForUserMock).toHaveBeenNthCalledWith(
        1,
        "user-1",
        WORKSPACE_UUID
      );
      expect(handleDuplicateWorkspaceFileMock).toHaveBeenCalledWith({
        fileId: "file-1",
        parentId: "folder-2",
        userId: "user-1",
        workspaceUuid: WORKSPACE_UUID,
      });
      expect(handleDuplicateWorkspaceFolderMock).not.toHaveBeenCalled();

      response = await POST(
        new Request(
          `http://localhost:3003/api/workspaces/${WORKSPACE_UUID}/items/duplicate`,
          {
            method: "POST",
            body: JSON.stringify({
              id: "folder-1",
              kind: "folder",
              parentId: "folder-9",
            }),
          }
        ),
        {
          params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
        }
      );

      expect(response.status).toBe(201);
      expect(ensureWorkspaceAccessForUserMock).toHaveBeenNthCalledWith(
        2,
        "user-1",
        WORKSPACE_UUID
      );
      expect(handleDuplicateWorkspaceFolderMock).toHaveBeenCalledWith({
        folderId: "folder-1",
        parentId: "folder-9",
        userId: "user-1",
        workspaceUuid: WORKSPACE_UUID,
      });
    } finally {
      vi.doUnmock("@/lib/workspace");
      vi.doUnmock("./workspace-item-duplicate-file");
      vi.doUnmock("./workspace-item-duplicate-folder");
      vi.resetModules();
    }
  });
});
