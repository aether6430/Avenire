import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createFolderMock,
  createWorkspaceNoteFileMock,
  getFileAssetByIdMock,
  getFolderWithAncestorsMock,
  getNoteContentMock,
  invalidateWorkspaceReadCachesMock,
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
    isMarkdownFileRecordMock.mockReset();
    listWorkspaceFilesMock.mockReset();
    listWorkspaceFoldersMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    registerFileAssetMock.mockReset();

    invalidateWorkspaceReadCachesMock.mockResolvedValue(undefined);
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
      reason: "folder.created",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
  });
});
