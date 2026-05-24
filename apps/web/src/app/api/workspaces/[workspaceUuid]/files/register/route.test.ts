import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createWorkspaceNoteFileMock,
  extractMarkdownNotePageMetadataMock,
  invalidateWorkspaceReadCachesMock,
  getSessionUserMock,
  isSharedFilesVirtualFolderIdMock,
  publishFilesInvalidationEventMock,
  registerWorkspaceUploadedFileMock,
  scheduleAsyncVideoDeliveryOptimizationMock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createWorkspaceNoteFileMock: vi.fn(),
  extractMarkdownNotePageMetadataMock: vi.fn(),
  invalidateWorkspaceReadCachesMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  publishFilesInvalidationEventMock: vi.fn(),
  registerWorkspaceUploadedFileMock: vi.fn(),
  scheduleAsyncVideoDeliveryOptimizationMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  createWorkspaceNoteFile: createWorkspaceNoteFileMock,
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/files-realtime-publisher", () => ({
  publishFilesInvalidationEvent: publishFilesInvalidationEventMock,
}));

vi.mock("@/lib/markdown-note-page-metadata", () => ({
  extractMarkdownNotePageMetadata: extractMarkdownNotePageMetadataMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/upload-registration", () => ({
  registerWorkspaceUploadedFile: registerWorkspaceUploadedFileMock,
}));

vi.mock("@/lib/video-delivery-optimization-runtime", () => ({
  scheduleAsyncVideoDeliveryOptimization:
    scheduleAsyncVideoDeliveryOptimizationMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

const WORKSPACE_UUID = "workspace-1";
const REGISTER_ROUTE_URL =
  "http://localhost:3003/api/workspaces/workspace-1/files/register";
const REGISTER_ROUTE_PARAMS = {
  params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
};
const SESSION_USER = { id: "user-1" };

function createApiLoggerStub() {
  return {
    featureUsed: vi.fn(),
    meter: vi.fn(),
    rateLimited: vi.fn(),
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function registerRequest(body: Record<string, unknown>) {
  return new Request(REGISTER_ROUTE_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function mockSessionUser() {
  getSessionUserMock.mockResolvedValue(SESSION_USER);
}

async function readErrorResponse(response: Response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

describe("/api/workspaces/[workspaceUuid]/files/register route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    createWorkspaceNoteFileMock.mockReset();
    extractMarkdownNotePageMetadataMock.mockReset();
    invalidateWorkspaceReadCachesMock.mockReset();
    getSessionUserMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    publishFilesInvalidationEventMock.mockReset();
    registerWorkspaceUploadedFileMock.mockReset();
    scheduleAsyncVideoDeliveryOptimizationMock.mockReset();
    userCanEditFolderMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    isSharedFilesVirtualFolderIdMock.mockReturnValue(false);
  });

  it.each([
    {
      body: {},
      error: "Unauthorized",
      name: "returns unauthorized when there is no signed-in user",
      prepare: () => {
        getSessionUserMock.mockResolvedValue(null);
      },
      status: 401,
    },
    {
      body: { name: "notes.md" },
      error: "Missing file metadata",
      name: "returns missing file metadata when folderId is absent",
      prepare: () => {
        mockSessionUser();
      },
      status: 400,
    },
    {
      body: { folderId: "shared-folder" },
      error: "Cannot create items in Shared Files",
      name: "blocks creation inside Shared Files",
      prepare: () => {
        mockSessionUser();
        isSharedFilesVirtualFolderIdMock.mockReturnValue(true);
      },
      status: 400,
    },
    {
      body: { folderId: "folder-1" },
      error: "Read-only folder",
      name: "returns read-only folder when the user cannot edit the destination",
      prepare: () => {
        mockSessionUser();
        userCanEditFolderMock.mockResolvedValue(false);
      },
      status: 403,
    },
  ])("$name", async ({ body, error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(
        await POST(registerRequest(body), REGISTER_ROUTE_PARAMS)
      )
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it("fails closed when session lookup throws before file registration handling begins", async () => {
    const apiLogger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValueOnce(apiLogger);
    getSessionUserMock.mockRejectedValue(
      new Error("file register auth offline")
    );

    const response = await POST(
      registerRequest({
        folderId: "folder-1",
        name: "notes.md",
        content: "# Notes",
      }),
      REGISTER_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "file register auth offline",
    });
    expect(createWorkspaceNoteFileMock).not.toHaveBeenCalled();
    expect(registerWorkspaceUploadedFileMock).not.toHaveBeenCalled();
    expect(apiLogger.requestSucceeded).not.toHaveBeenCalled();
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.any(Error)
    );
  });

  it("creates markdown notes with merged page metadata and publishes invalidation events", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    extractMarkdownNotePageMetadataMock.mockReturnValue({
      cover: "stars",
      properties: {
        topic: "AI",
      },
    });
    createWorkspaceNoteFileMock.mockResolvedValue({
      id: "file-1",
      mimeType: "text/markdown",
      sizeBytes: 12,
    });

    const response = await POST(
      registerRequest({
        folderId: "folder-1",
        name: "notes.md",
        content: "# Notes",
        metadata: {
          extra: true,
          page: {
            icon: "spark",
            properties: {
              difficulty: "hard",
            },
          },
        },
      }),
      REGISTER_ROUTE_PARAMS
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      file: {
        id: "file-1",
        mimeType: "text/markdown",
        sizeBytes: 12,
      },
      ingestionJob: null,
      deduplicated: false,
    });
    expect(createWorkspaceNoteFileMock).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_UUID,
      userId: "user-1",
      folderId: "folder-1",
      name: "notes.md",
      baseContent: "# Notes",
      content: "# Notes",
      metadata: {
        extra: true,
        page: {
          cover: "stars",
          icon: "spark",
          properties: {
            difficulty: "hard",
            topic: "AI",
          },
        },
      },
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(2);
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(1, {
      fileId: "file-1",
      folderId: "folder-1",
      reason: "file.created",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenNthCalledWith(2, {
      reason: "tree.changed",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
  });

  it("returns a 500 json error when note creation throws before invalidation work begins", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    const apiLogger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValueOnce(apiLogger);
    createWorkspaceNoteFileMock.mockRejectedValueOnce(
      new Error("note storage offline")
    );

    const response = await POST(
      registerRequest({
        folderId: "folder-1",
        name: "notes.md",
        content: "# Notes",
      }),
      REGISTER_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to register file",
    });
    expect(publishFilesInvalidationEventMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(apiLogger.requestSucceeded).not.toHaveBeenCalled();
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "note storage offline",
      }),
      {
        workspaceUuid: WORKSPACE_UUID,
      }
    );
  });

  it("returns a 500 json error when note invalidation publishing throws after file creation", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    const apiLogger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValueOnce(apiLogger);
    createWorkspaceNoteFileMock.mockResolvedValueOnce({
      id: "file-1",
      mimeType: "text/markdown",
      sizeBytes: 12,
    });
    publishFilesInvalidationEventMock.mockRejectedValueOnce(
      new Error("realtime offline")
    );

    const response = await POST(
      registerRequest({
        folderId: "folder-1",
        name: "notes.md",
        content: "# Notes",
      }),
      REGISTER_ROUTE_PARAMS
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to register file",
    });
    expect(publishFilesInvalidationEventMock).toHaveBeenCalledTimes(1);
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
    expect(apiLogger.requestSucceeded).not.toHaveBeenCalled();
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "realtime offline",
      }),
      {
        workspaceUuid: WORKSPACE_UUID,
      }
    );
  });

  it("returns storage limit reached when stored upload registration exceeds plan storage", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    registerWorkspaceUploadedFileMock.mockRejectedValue(
      Object.assign(new Error("storage full"), {
        code: "STORAGE_LIMIT",
      })
    );

    const response = await POST(
      registerRequest({
        folderId: "folder-1",
        storageKey: "key-1",
        storageUrl: "https://cdn.example.com/file.pdf",
        name: "file.pdf",
        sizeBytes: 42,
      }),
      REGISTER_ROUTE_PARAMS
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Storage limit reached",
    });
  });

  it("schedules async optimization for newly created videos and returns the ingestion job", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    registerWorkspaceUploadedFileMock.mockResolvedValue({
      status: "created",
      file: {
        id: "file-video-1",
        mimeType: "video/mp4",
        sizeBytes: 2048,
      },
      ingestionJob: {
        id: "job-1",
      },
    });

    const response = await POST(
      registerRequest({
        folderId: "folder-1",
        storageKey: "key-1",
        storageUrl: "https://cdn.example.com/video.mp4",
        name: "video.mp4",
        sizeBytes: 2048,
        mimeType: "video/mp4",
      }),
      REGISTER_ROUTE_PARAMS
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      file: {
        id: "file-video-1",
        mimeType: "video/mp4",
        sizeBytes: 2048,
      },
      ingestionJob: {
        id: "job-1",
      },
      deduplicated: false,
    });
    expect(scheduleAsyncVideoDeliveryOptimizationMock).toHaveBeenCalledWith({
      file: {
        id: "file-video-1",
        mimeType: "video/mp4",
        sizeBytes: 2048,
      },
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
  });
});
