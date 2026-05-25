import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createWorkspaceNoteFileMock,
  getFileAssetByIdMock,
  getNoteContentMock,
  isMarkdownFileRecordMock,
  listWorkspaceFilesMock,
  registerFileAssetMock,
  randomUUIDMock,
} = vi.hoisted(() => ({
  createWorkspaceNoteFileMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  listWorkspaceFilesMock: vi.fn(),
  randomUUIDMock: vi.fn(),
  registerFileAssetMock: vi.fn(),
}));

vi.mock("node:crypto", () => ({
  randomUUID: randomUUIDMock,
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  getFileAssetById: getFileAssetByIdMock,
  getNoteContent: getNoteContentMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  listWorkspaceFiles: listWorkspaceFilesMock,
  registerFileAsset: registerFileAssetMock,
}));

import { duplicateSharedFileIntoWorkspace } from "./shared-resource-duplicate-file";

describe("shared resource duplicate file", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    randomUUIDMock.mockReturnValue("uuid-1");
    listWorkspaceFilesMock.mockResolvedValue([]);
    getFileAssetByIdMock.mockResolvedValue({
      contentHashSha256: "hash-1",
      hashComputedBy: "server",
      hashVerificationStatus: "verified",
      id: "file-1",
      mimeType: "text/markdown",
      name: "Notes.md",
      sizeBytes: 12,
      storageUrl: "https://cdn.avenire.app/file-1",
    });
    createWorkspaceNoteFileMock.mockResolvedValue({
      id: "file-copy",
    });
    registerFileAssetMock.mockResolvedValue({
      id: "binary-copy",
    });
  });

  it("fails closed when the source file cannot be loaded", async () => {
    getFileAssetByIdMock.mockResolvedValueOnce(null);

    const response = await duplicateSharedFileIntoWorkspace({
      buildRoute: ({ fileId, folderId }) =>
        `/workspace/files/workspace-1/folder/${folderId}?file=${fileId}`,
      fileId: "file-1",
      sourceWorkspaceId: "workspace-source",
      targetFolderId: "folder-1",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to copy file.",
    });
  });

  it("duplicates markdown notes using stored note content before falling back to storage fetch", async () => {
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockResolvedValue({
      content: "# Hello",
    });

    const response = await duplicateSharedFileIntoWorkspace({
      buildRoute: ({ fileId, folderId }) =>
        `/workspace/files/workspace-1/folder/${folderId}?file=${fileId}`,
      fileId: "file-1",
      sourceWorkspaceId: "workspace-source",
      targetFolderId: "folder-1",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });

    expect(createWorkspaceNoteFileMock).toHaveBeenCalledWith({
      baseContent: "# Hello",
      content: "# Hello",
      folderId: "folder-1",
      name: "Notes.md",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      copied: true,
      route: "/workspace/files/workspace-1/folder/folder-1?file=file-copy",
    });
  });

  it("fetches note content from storage when no stored markdown content exists", async () => {
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockResolvedValue({
      content: null,
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: vi.fn().mockResolvedValue("# Remote"),
      })
    );

    await duplicateSharedFileIntoWorkspace({
      buildRoute: ({ fileId, folderId }) =>
        `/workspace/files/workspace-1/folder/${folderId}?file=${fileId}`,
      fileId: "file-1",
      sourceWorkspaceId: "workspace-source",
      targetFolderId: "folder-1",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });

    expect(fetch).toHaveBeenCalledWith("https://cdn.avenire.app/file-1", {
      cache: "no-store",
    });
    expect(createWorkspaceNoteFileMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseContent: "# Remote",
        content: "# Remote",
      })
    );
  });

  it("duplicates non-markdown files through registerFileAsset with a virtual duplicate key", async () => {
    isMarkdownFileRecordMock.mockReturnValue(false);
    listWorkspaceFilesMock.mockResolvedValue([
      {
        folderId: "folder-1",
        name: "Notes.md",
      },
    ]);

    const response = await duplicateSharedFileIntoWorkspace({
      buildRoute: ({ fileId, folderId }) =>
        `/workspace/files/workspace-1/folder/${folderId}?file=${fileId}`,
      fileId: "file-1",
      sourceWorkspaceId: "workspace-source",
      targetFolderId: "folder-1",
      targetWorkspaceId: "workspace-1",
      userId: "user-1",
    });

    expect(registerFileAssetMock).toHaveBeenCalledWith(
      "workspace-1",
      "user-1",
      expect.objectContaining({
        folderId: "folder-1",
        name: "Notes (1).md",
        storageKey: "virtual:duplicate:file-1:uuid-1",
        storageUrl: "https://cdn.avenire.app/file-1",
      })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      copied: true,
      route: "/workspace/files/workspace-1/folder/folder-1?file=binary-copy",
    });
  });
});
