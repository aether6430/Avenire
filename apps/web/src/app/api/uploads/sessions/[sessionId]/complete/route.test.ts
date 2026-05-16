import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  assembleMultipartPartsToFileMock,
  clearMultipartPartsMock,
  createApiLoggerMock,
  getSessionUserMock,
  getUploadSessionMock,
  normalizeSha256Mock,
  openAsBlobMock,
  registerWorkspaceUploadedFileMock,
  saveUploadSessionMock,
  scheduleAsyncVideoDeliveryOptimizationMock,
  userCanEditFolderMock,
  utApiDeleteFilesMock,
  utApiUploadFilesMock,
} = vi.hoisted(() => ({
  assembleMultipartPartsToFileMock: vi.fn(),
  clearMultipartPartsMock: vi.fn(),
  createApiLoggerMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  getUploadSessionMock: vi.fn(),
  normalizeSha256Mock: vi.fn(),
  openAsBlobMock: vi.fn(),
  registerWorkspaceUploadedFileMock: vi.fn(),
  saveUploadSessionMock: vi.fn(),
  scheduleAsyncVideoDeliveryOptimizationMock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
  utApiDeleteFilesMock: vi.fn(),
  utApiUploadFilesMock: vi.fn(),
}));

vi.mock("node:fs", () => ({
  openAsBlob: openAsBlobMock,
}));

vi.mock("@avenire/storage", () => ({
  UTApi: vi.fn().mockImplementation(() => ({
    deleteFiles: utApiDeleteFilesMock,
    uploadFiles: utApiUploadFilesMock,
  })),
  UTFile: vi.fn(),
}));

vi.mock("@/lib/file-data", () => ({
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/upload-multipart-assembly", () => ({
  assembleMultipartPartsToFile: assembleMultipartPartsToFileMock,
  clearMultipartParts: clearMultipartPartsMock,
}));

vi.mock("@/lib/upload-registration", () => ({
  normalizeSha256: normalizeSha256Mock,
  registerWorkspaceUploadedFile: registerWorkspaceUploadedFileMock,
}));

vi.mock("@/lib/upload-session-store", () => ({
  getUploadSession: getUploadSessionMock,
  saveUploadSession: saveUploadSessionMock,
}));

vi.mock("@/lib/video-delivery-optimization", () => ({
  scheduleAsyncVideoDeliveryOptimization:
    scheduleAsyncVideoDeliveryOptimizationMock,
}));

vi.mock("@/lib/workspace", () => ({
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

function createApiLoggerStub() {
  return {
    info: vi.fn(),
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
    warn: vi.fn(),
  };
}

function createSession() {
  return {
    id: "session-1",
    userId: "user-1",
    workspaceUuid: "workspace-1",
    folderId: "folder-1",
    createdAt: new Date(Date.now() - 5000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    name: "lecture.pdf",
    mimeType: "application/pdf",
    checksumSha256: "abc123",
    sizeBytes: 42,
    upload: null,
    result: null,
  };
}

describe("/api/uploads/sessions/[sessionId]/complete route", () => {
  beforeEach(() => {
    assembleMultipartPartsToFileMock.mockReset();
    clearMultipartPartsMock.mockReset();
    createApiLoggerMock.mockReset();
    getSessionUserMock.mockReset();
    getUploadSessionMock.mockReset();
    normalizeSha256Mock.mockReset();
    openAsBlobMock.mockReset();
    registerWorkspaceUploadedFileMock.mockReset();
    saveUploadSessionMock.mockReset();
    scheduleAsyncVideoDeliveryOptimizationMock.mockReset();
    userCanEditFolderMock.mockReset();
    utApiDeleteFilesMock.mockReset();
    utApiUploadFilesMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    normalizeSha256Mock.mockImplementation(
      (value: string | null | undefined) => value ?? null
    );
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns not found when the session does not exist", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Session not found",
    });
  });

  it("replays the stored result idempotently when the session is already completed", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue({
      ...createSession(),
      result: {
        fileId: "file-1",
        ingestionJobId: "job-1",
        deduplicated: false,
      },
      upload: {
        sizeBytes: 42,
      },
    });
    userCanEditFolderMock.mockResolvedValue(true);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      fileId: "file-1",
      ingestionJobId: "job-1",
      deduplicated: false,
    });
  });

  it("returns invalid payload when neither direct metadata nor multipart completion is provided", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(createSession());
    userCanEditFolderMock.mockResolvedValue(true);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({ metadata: { source: "test" } }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("returns checksum mismatch when client metadata does not match the session checksum", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(createSession());
    userCanEditFolderMock.mockResolvedValue(true);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({
            storageKey: "key-1",
            storageUrl: "https://example.com/file",
            sizeBytes: 42,
            checksumSha256: "different",
            mimeType: "application/pdf",
          }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toEqual({
      error: "Checksum mismatch",
    });
  });

  it("returns upload usage limit reached when registration is rate limited", async () => {
    const session = createSession();
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(session);
    userCanEditFolderMock.mockResolvedValue(true);
    saveUploadSessionMock
      .mockResolvedValueOnce({
        ...session,
        status: "uploaded",
        upload: {
          storageKey: "key-1",
          storageUrl: "https://example.com/file",
          mimeType: "application/pdf",
          sizeBytes: 42,
          checksumSha256: "abc123",
        },
      })
      .mockResolvedValueOnce({
        ...session,
        status: "verified",
        upload: {
          storageKey: "key-1",
          storageUrl: "https://example.com/file",
          mimeType: "application/pdf",
          sizeBytes: 42,
          checksumSha256: "abc123",
        },
      })
      .mockResolvedValueOnce({
        ...session,
        status: "failed",
        upload: {
          storageKey: "key-1",
          storageUrl: "https://example.com/file",
          mimeType: "application/pdf",
          sizeBytes: 42,
          checksumSha256: "abc123",
        },
      });
    registerWorkspaceUploadedFileMock.mockRejectedValue({
      code: "UPLOAD_RATE_LIMIT",
      retryAfter: "2026-05-13T12:00:00.000Z",
    });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/complete",
        {
          method: "POST",
          body: JSON.stringify({
            storageKey: "key-1",
            storageUrl: "https://example.com/file",
            sizeBytes: 42,
            checksumSha256: "abc123",
            mimeType: "application/pdf",
          }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({
      error: "Upload usage limit reached",
      retryAfter: "2026-05-13T12:00:00.000Z",
    });
  });
});
