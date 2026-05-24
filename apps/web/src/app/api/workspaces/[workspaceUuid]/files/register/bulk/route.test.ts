import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  invalidateWorkspaceReadCachesMock,
  getSessionUserMock,
  isSharedFilesVirtualFolderIdMock,
  registerWorkspaceMarkdownNoteMock,
  registerWorkspaceUploadedFileMock,
  scheduleAsyncVideoDeliveryOptimizationMock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  invalidateWorkspaceReadCachesMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isSharedFilesVirtualFolderIdMock: vi.fn(),
  registerWorkspaceMarkdownNoteMock: vi.fn(),
  registerWorkspaceUploadedFileMock: vi.fn(),
  scheduleAsyncVideoDeliveryOptimizationMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateWorkspaceReadCaches: invalidateWorkspaceReadCachesMock,
}));

vi.mock("@/lib/file-data", () => ({
  isSharedFilesVirtualFolderId: isSharedFilesVirtualFolderIdMock,
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/upload-registration", () => ({
  registerWorkspaceMarkdownNote: registerWorkspaceMarkdownNoteMock,
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
const BULK_ROUTE_URL =
  "http://localhost:3003/api/workspaces/workspace-1/files/register/bulk";

function bulkRegisterRequest(body: Record<string, unknown>) {
  return new Request(BULK_ROUTE_URL, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function bulkRouteParams() {
  return {
    params: Promise.resolve({ workspaceUuid: WORKSPACE_UUID }),
  };
}

function mockSessionUser() {
  getSessionUserMock.mockResolvedValue({ id: "user-1" });
}

async function readErrorResponse(response: Response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

describe("/api/workspaces/[workspaceUuid]/files/register/bulk route", () => {
  const noteFolderId = "11111111-1111-4111-8111-111111111111";
  const readOnlyFolderId = "22222222-2222-4222-8222-222222222222";
  const sharedFolderId = "33333333-3333-4333-8333-333333333333";

  beforeEach(() => {
    invalidateWorkspaceReadCachesMock.mockReset();
    getSessionUserMock.mockReset();
    isSharedFilesVirtualFolderIdMock.mockReset();
    registerWorkspaceMarkdownNoteMock.mockReset();
    registerWorkspaceUploadedFileMock.mockReset();
    scheduleAsyncVideoDeliveryOptimizationMock.mockReset();
    userCanEditFolderMock.mockReset();

    isSharedFilesVirtualFolderIdMock.mockImplementation(
      (folderId: string) => folderId === sharedFolderId
    );
  });

  it.each([
    {
      body: { files: [] },
      error: "Unauthorized",
      name: "returns unauthorized when there is no signed-in user",
      prepare: () => {
        getSessionUserMock.mockResolvedValue(null);
      },
      status: 401,
    },
    {
      body: {
        files: [{ clientUploadId: "client-1", name: "notes.md" }],
      },
      error: "Invalid payload",
      name: "rejects invalid batch payloads",
      prepare: () => {
        mockSessionUser();
      },
      status: 400,
    },
  ])("$name", async ({ body, error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(
        await POST(bulkRegisterRequest(body), bulkRouteParams())
      )
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it("fails closed when session lookup throws before bulk registration handling begins", async () => {
    getSessionUserMock.mockRejectedValue(
      new Error("bulk register auth offline")
    );

    await expect(
      readErrorResponse(
        await POST(
          bulkRegisterRequest({
            files: [
              {
                clientUploadId: "client-note",
                folderId: noteFolderId,
                name: "notes.md",
                content: "# Notes",
              },
            ],
          }),
          bulkRouteParams()
        )
      )
    ).resolves.toEqual({
      body: { error: "bulk register auth offline" },
      status: 500,
    });
    expect(registerWorkspaceMarkdownNoteMock).not.toHaveBeenCalled();
    expect(registerWorkspaceUploadedFileMock).not.toHaveBeenCalled();
  });

  it("processes mixed note and upload registrations, caches folder permissions by unique editable folder, and invalidates caches after successful items", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockImplementation(
      async ({ folderId }: { folderId: string }) => folderId === noteFolderId
    );
    registerWorkspaceMarkdownNoteMock.mockResolvedValue({
      file: {
        id: "note-1",
        mimeType: "text/markdown",
      },
      ingestionJob: null,
      status: "created",
    });
    registerWorkspaceUploadedFileMock.mockResolvedValue({
      file: {
        id: "video-1",
        mimeType: "video/mp4",
      },
      ingestionJob: { id: "job-1" },
      status: "created",
    });

    const response = await POST(
      bulkRegisterRequest({
        files: [
          {
            clientUploadId: "client-note",
            folderId: noteFolderId,
            name: "notes.md",
            content: "# Notes",
          },
          {
            clientUploadId: "client-video",
            folderId: noteFolderId,
            name: "lecture.mp4",
            mimeType: "video/mp4",
            sizeBytes: 42,
            storageKey: "storage-key",
            storageUrl: "https://cdn.example.com/lecture.mp4",
            contentHashSha256:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
            hashComputedBy: "client",
          },
          {
            clientUploadId: "client-read-only",
            folderId: readOnlyFolderId,
            name: "locked.md",
            content: "# Locked",
          },
          {
            clientUploadId: "client-shared",
            folderId: sharedFolderId,
            name: "shared.md",
            content: "# Shared",
          },
        ],
      }),
      bulkRouteParams()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: {
        total: 4,
        succeeded: 2,
        failed: 2,
      },
      results: [
        {
          clientUploadId: "client-note",
          status: "ok",
          file: { id: "note-1" },
          ingestionJob: null,
        },
        {
          clientUploadId: "client-video",
          status: "ok",
          file: { id: "video-1" },
          ingestionJob: { id: "job-1" },
        },
        {
          clientUploadId: "client-read-only",
          status: "failed",
          error: "Read-only folder",
        },
        {
          clientUploadId: "client-shared",
          status: "failed",
          error: "Cannot create items in Shared Files",
        },
      ],
    });
    expect(userCanEditFolderMock).toHaveBeenCalledTimes(2);
    expect(userCanEditFolderMock).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_UUID,
      folderId: noteFolderId,
      userId: "user-1",
    });
    expect(userCanEditFolderMock).toHaveBeenCalledWith({
      workspaceId: WORKSPACE_UUID,
      folderId: readOnlyFolderId,
      userId: "user-1",
    });
    expect(registerWorkspaceMarkdownNoteMock).toHaveBeenCalledWith({
      content: "# Notes",
      dedupeMode: "allow",
      folderId: noteFolderId,
      metadata: undefined,
      name: "notes.md",
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(registerWorkspaceUploadedFileMock).toHaveBeenCalledWith({
      workspaceUuid: WORKSPACE_UUID,
      userId: "user-1",
      folderId: noteFolderId,
      storageKey: "storage-key",
      storageUrl: "https://cdn.example.com/lecture.mp4",
      name: "lecture.mp4",
      mimeType: "video/mp4",
      sizeBytes: 42,
      metadata: undefined,
      contentHashSha256:
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      hashComputedBy: "client",
      dedupeMode: "allow",
    });
    expect(scheduleAsyncVideoDeliveryOptimizationMock).toHaveBeenCalledWith({
      file: {
        id: "video-1",
        mimeType: "video/mp4",
      },
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(invalidateWorkspaceReadCachesMock).toHaveBeenCalledWith(
      WORKSPACE_UUID
    );
  });

  it("returns a 500 json error when folder permission preflight throws before processing items", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockRejectedValueOnce(
      new Error("bulk permission offline")
    );

    const response = await POST(
      bulkRegisterRequest({
        files: [
          {
            clientUploadId: "client-note",
            folderId: noteFolderId,
            name: "notes.md",
            content: "# Notes",
          },
        ],
      }),
      bulkRouteParams()
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bulk permission offline",
    });
    expect(registerWorkspaceMarkdownNoteMock).not.toHaveBeenCalled();
    expect(registerWorkspaceUploadedFileMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
  });

  it("maps per-item rate limits and generic failures without invalidating caches when nothing succeeds", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    registerWorkspaceMarkdownNoteMock.mockRejectedValue(
      new Error("Unable to register note")
    );
    registerWorkspaceUploadedFileMock.mockRejectedValue(
      Object.assign(new Error("storage full"), {
        code: "STORAGE_LIMIT",
      })
    );

    const response = await POST(
      bulkRegisterRequest({
        dedupeMode: "skip",
        files: [
          {
            clientUploadId: "client-note",
            folderId: noteFolderId,
            name: "notes.md",
            content: "# Notes",
          },
          {
            clientUploadId: "client-upload",
            folderId: noteFolderId,
            name: "slides.pdf",
            mimeType: "application/pdf",
            sizeBytes: 12,
            storageKey: "storage-key",
            storageUrl: "https://cdn.example.com/slides.pdf",
          },
        ],
      }),
      bulkRouteParams()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      summary: {
        total: 2,
        succeeded: 0,
        failed: 2,
      },
      results: [
        {
          clientUploadId: "client-note",
          status: "failed",
          error: "Unable to register note",
        },
        {
          clientUploadId: "client-upload",
          status: "failed",
          error: "Storage limit reached",
        },
      ],
    });
    expect(registerWorkspaceMarkdownNoteMock).toHaveBeenCalledWith({
      content: "# Notes",
      dedupeMode: "skip",
      folderId: noteFolderId,
      metadata: undefined,
      name: "notes.md",
      userId: "user-1",
      workspaceUuid: WORKSPACE_UUID,
    });
    expect(registerWorkspaceUploadedFileMock).toHaveBeenCalledWith({
      workspaceUuid: WORKSPACE_UUID,
      userId: "user-1",
      folderId: noteFolderId,
      storageKey: "storage-key",
      storageUrl: "https://cdn.example.com/slides.pdf",
      name: "slides.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12,
      metadata: undefined,
      contentHashSha256: undefined,
      hashComputedBy: undefined,
      dedupeMode: "skip",
    });
    expect(scheduleAsyncVideoDeliveryOptimizationMock).not.toHaveBeenCalled();
    expect(invalidateWorkspaceReadCachesMock).not.toHaveBeenCalled();
  });

  it("returns a 500 json error when cache invalidation throws after successful registrations", async () => {
    mockSessionUser();
    userCanEditFolderMock.mockResolvedValue(true);
    registerWorkspaceMarkdownNoteMock.mockResolvedValue({
      file: {
        id: "note-1",
        mimeType: "text/markdown",
      },
      ingestionJob: null,
      status: "created",
    });
    invalidateWorkspaceReadCachesMock.mockRejectedValueOnce(
      new Error("bulk cache offline")
    );

    const response = await POST(
      bulkRegisterRequest({
        files: [
          {
            clientUploadId: "client-note",
            folderId: noteFolderId,
            name: "notes.md",
            content: "# Notes",
          },
        ],
      }),
      bulkRouteParams()
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "bulk cache offline",
    });
  });
});
