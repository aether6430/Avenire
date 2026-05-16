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

vi.mock("@/lib/video-delivery-optimization", () => ({
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
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
  });

  it("returns upload usage limit reached when stored upload registration is rate limited", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    registerWorkspaceUploadedFileMock.mockRejectedValue(
      Object.assign(new Error("limit"), {
        code: "UPLOAD_RATE_LIMIT",
        retryAfter: "60",
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
      error: "Upload usage limit reached",
      retryAfter: "60",
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
