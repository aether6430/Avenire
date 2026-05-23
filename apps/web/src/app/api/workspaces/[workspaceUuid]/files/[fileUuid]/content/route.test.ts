import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  deleteUploadThingFileMock,
  getFileAssetByIdMock,
  getSessionUserMock,
  isMarkdownFileRecordMock,
  isTrustedStorageUrlMock,
  publishFilesInvalidationEventMock,
  replaceFileAssetContentMock,
  upsertMarkdownFileContentMock,
  userCanEditFileMock,
} = vi.hoisted(() => ({
  deleteUploadThingFileMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  isTrustedStorageUrlMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  replaceFileAssetContentMock: vi.fn(),
  upsertMarkdownFileContentMock: vi.fn(),
  userCanEditFileMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
  isTrustedStorageUrl: isTrustedStorageUrlMock,
  replaceFileAssetContent: replaceFileAssetContentMock,
  upsertMarkdownFileContent: upsertMarkdownFileContentMock,
  userCanEditFile: userCanEditFileMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/upload-registration", () => ({
  deleteUploadThingFile: deleteUploadThingFileMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { PATCH } from "./route";

describe("/api/workspaces/[workspaceUuid]/files/[fileUuid]/content route", () => {
  beforeEach(() => {
    deleteUploadThingFileMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getSessionUserMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    isTrustedStorageUrlMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    replaceFileAssetContentMock.mockReset();
    upsertMarkdownFileContentMock.mockReset();
    userCanEditFileMock.mockReset();

    publishFilesInvalidationEventMock.mockResolvedValue(undefined);
    isTrustedStorageUrlMock.mockReturnValue(true);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "# Updated" }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before content replacement handling begins", async () => {
    getSessionUserMock.mockRejectedValueOnce(new Error("content auth offline"));

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "# Updated" }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "content auth offline",
    });
    expect(userCanEditFileMock).not.toHaveBeenCalled();
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(upsertMarkdownFileContentMock).not.toHaveBeenCalled();
    expect(replaceFileAssetContentMock).not.toHaveBeenCalled();
  });

  it("returns read-only file when the user cannot edit it", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(false);

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "# Updated" }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Read-only file" });
  });

  it("rejects note records and redirects callers to the note update route", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({ isNote: true });

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "# Updated" }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Use the note update route",
    });
  });

  it("updates markdown-backed files through markdown content storage", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-1",
      isNote: false,
    });
    isMarkdownFileRecordMock.mockReturnValue(true);
    upsertMarkdownFileContentMock.mockResolvedValue({
      file: {
        id: "file-1",
        folderId: "folder-1",
        storageKey: "new-key",
      },
      previousStorageKey: "old-key",
    });

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({
            content: "# Updated",
            page: { icon: " spark " },
          }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      file: {
        id: "file-1",
        folderId: "folder-1",
        storageKey: "new-key",
      },
    });
    expect(upsertMarkdownFileContentMock).toHaveBeenCalledWith({
      content: "# Updated",
      fileId: "file-1",
      metadata: {
        page: {
          bannerUrl: null,
          icon: "spark",
          properties: {},
        },
      },
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(replaceFileAssetContentMock).not.toHaveBeenCalled();
    expect(deleteUploadThingFileMock).toHaveBeenCalledWith("old-key");
  });

  it("rejects invalid binary replacement requests", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-1",
      isNote: false,
    });
    isMarkdownFileRecordMock.mockReturnValue(false);

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({
            storageKey: "key-1",
            storageUrl: "https://cdn.example.com/file",
          }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
    });
  });

  it("rejects untrusted binary sources", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-1",
      isNote: false,
    });
    isMarkdownFileRecordMock.mockReturnValue(false);
    isTrustedStorageUrlMock.mockReturnValue(false);

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({
            sizeBytes: 42,
            storageKey: "key-1",
            storageUrl: "https://evil.example.com/file",
          }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid file source",
    });
  });

  it("replaces binary file content and cleans up the previous blob", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: "file-1",
      folderId: "folder-2",
      isNote: false,
    });
    isMarkdownFileRecordMock.mockReturnValue(false);
    replaceFileAssetContentMock.mockResolvedValue({
      file: {
        id: "file-1",
        folderId: "folder-2",
        storageKey: "new-binary-key",
      },
      previousStorageKey: "old-binary-key",
    });

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({
            mimeType: "application/pdf",
            page: { icon: " pdf " },
            sizeBytes: 512,
            storageKey: " new-binary-key ",
            storageUrl: " https://cdn.example.com/file.pdf ",
          }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      file: {
        id: "file-1",
        folderId: "folder-2",
        storageKey: "new-binary-key",
      },
    });
    expect(replaceFileAssetContentMock).toHaveBeenCalledWith(
      "workspace-1",
      "file-1",
      "user-1",
      {
        contentHashSha256: null,
        hashComputedBy: null,
        hashVerificationStatus: null,
        metadata: {
          page: {
            bannerUrl: null,
            icon: "pdf",
            properties: {},
          },
        },
        mimeType: "application/pdf",
        sizeBytes: 512,
        storageKey: "new-binary-key",
        storageUrl: "https://cdn.example.com/file.pdf",
      }
    );
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledWith({
      workspaceUuid: "workspace-1",
      folderId: "folder-2",
      reason: "file.updated",
    });
    expect(deleteUploadThingFileMock).toHaveBeenCalledWith("old-binary-key");
  });

  it("fails closed with an explicit content error when file replacement runtime throws", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    userCanEditFileMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockRejectedValue(new Error("content offline"));

    const response = await PATCH(
      new Request(
        "http://localhost:3003/api/workspaces/workspace-1/files/file-1/content",
        {
          method: "PATCH",
          body: JSON.stringify({ content: "# Updated" }),
        }
      ),
      {
        params: Promise.resolve({
          workspaceUuid: "workspace-1",
          fileUuid: "file-1",
        }),
      }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "content offline",
    });
    expect(upsertMarkdownFileContentMock).not.toHaveBeenCalled();
    expect(replaceFileAssetContentMock).not.toHaveBeenCalled();
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
  });
});
