import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  canStoreBytesMock,
  createApiLoggerMock,
  createUploadSessionMock,
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  normalizeSha256Mock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  canStoreBytesMock: vi.fn(),
  createApiLoggerMock: vi.fn(),
  createUploadSessionMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  normalizeSha256Mock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@/lib/billing", () => ({
  canStoreBytes: canStoreBytesMock,
}));

vi.mock("@/lib/file-data", () => ({
  userCanEditFolder: userCanEditFolderMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/upload-registration", () => ({
  normalizeSha256: normalizeSha256Mock,
}));

vi.mock("@/lib/upload-session-store", () => ({
  createUploadSession: createUploadSessionMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

function createApiLoggerStub() {
  return {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

describe("/api/uploads/sessions route", () => {
  beforeEach(() => {
    canStoreBytesMock.mockReset();
    createApiLoggerMock.mockReset();
    createUploadSessionMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    normalizeSha256Mock.mockReset();
    userCanEditFolderMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    normalizeSha256Mock.mockImplementation(
      (value: string | null | undefined) => value ?? null
    );
    canStoreBytesMock.mockResolvedValue({
      ok: true,
      limitBytes: 2 * 1024 * 1024 * 1024,
      remainingBytes: 2 * 1024 * 1024 * 1024,
      usedBytes: 0,
    });
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("fails closed when session lookup throws before upload session creation begins", async () => {
    getSessionUserMock.mockRejectedValue(new Error("upload auth offline"));

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "upload auth offline",
    });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(createUploadSessionMock).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: "workspace-1",
        }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("rejects malformed JSON with the same public payload error", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: "{",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid payload" });
    expect(createUploadSessionMock).not.toHaveBeenCalled();
  });

  it("returns forbidden when the user cannot access the workspace or edit the folder", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValueOnce(false);

    let response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: "11111111-1111-4111-8111-111111111111",
          folderId: "22222222-2222-4222-8222-222222222222",
          name: "lecture.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1024,
        }),
      })
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });

    ensureWorkspaceAccessForUserMock.mockResolvedValueOnce(true);
    userCanEditFolderMock.mockResolvedValueOnce(false);
    response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: "11111111-1111-4111-8111-111111111111",
          folderId: "22222222-2222-4222-8222-222222222222",
          name: "lecture.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1024,
        }),
      })
    );
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Read-only folder",
    });
  });

  it("returns storage limit reached when the upload would exceed the user's plan", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
    canStoreBytesMock.mockResolvedValueOnce({
      ok: false,
      limitBytes: 2048,
      remainingBytes: 0,
      usedBytes: 2048,
    });

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: "11111111-1111-4111-8111-111111111111",
          folderId: "22222222-2222-4222-8222-222222222222",
          name: "lecture.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1024,
        }),
      })
    );

    expect(canStoreBytesMock).toHaveBeenCalledWith("user-1", 1024);
    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Storage limit reached",
      limitBytes: 2048,
      usedBytes: 2048,
    });
    expect(createUploadSessionMock).not.toHaveBeenCalled();
  });

  it("creates an upload session with trimmed names and normalized checksums", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
    createUploadSessionMock.mockResolvedValue({
      id: "session-1",
      userId: "user-1",
      workspaceUuid: "11111111-1111-4111-8111-111111111111",
      folderId: "22222222-2222-4222-8222-222222222222",
      name: "lecture.mp4",
    });

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: "11111111-1111-4111-8111-111111111111",
          folderId: "22222222-2222-4222-8222-222222222222",
          name: " lecture.mp4 ",
          mimeType: "video/mp4",
          sizeBytes: 1024,
          checksumSha256: "abc123",
        }),
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      session: {
        id: "session-1",
        userId: "user-1",
        workspaceUuid: "11111111-1111-4111-8111-111111111111",
        folderId: "22222222-2222-4222-8222-222222222222",
        name: "lecture.mp4",
      },
      multipart: {
        recommendedPartSizeBytes: 16 * 1024 * 1024,
      },
    });
    expect(normalizeSha256Mock).toHaveBeenCalledWith("abc123");
    expect(createUploadSessionMock).toHaveBeenCalledWith({
      userId: "user-1",
      workspaceUuid: "11111111-1111-4111-8111-111111111111",
      folderId: "22222222-2222-4222-8222-222222222222",
      name: "lecture.mp4",
      mimeType: "video/mp4",
      sizeBytes: 1024,
      checksumSha256: "abc123",
    });
  });

  it("fails closed with an explicit session creation error when session persistence throws", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
    createUploadSessionMock.mockRejectedValue(
      new Error("session store offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/uploads/sessions", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: "11111111-1111-4111-8111-111111111111",
          folderId: "22222222-2222-4222-8222-222222222222",
          name: "lecture.mp4",
          mimeType: "video/mp4",
          sizeBytes: 1024,
        }),
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "session store offline",
    });
  });
});
