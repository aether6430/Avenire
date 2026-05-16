import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createUploadSessionMock,
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  getUserUsageOverviewMock,
  normalizeSha256Mock,
  userCanEditFolderMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createUploadSessionMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  getUserUsageOverviewMock: vi.fn(),
  normalizeSha256Mock: vi.fn(),
  userCanEditFolderMock: vi.fn(),
}));

vi.mock("@/lib/billing-usage", () => ({
  getUserUsageOverview: getUserUsageOverviewMock,
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
    createApiLoggerMock.mockReset();
    createUploadSessionMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    getUserUsageOverviewMock.mockReset();
    normalizeSha256Mock.mockReset();
    userCanEditFolderMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    normalizeSha256Mock.mockImplementation(
      (value: string | null | undefined) => value ?? null
    );
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

  it("returns upload usage limit reached when the user has no upload balance", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
    getUserUsageOverviewMock.mockResolvedValue({
      upload: {
        totalBalance: 0,
      },
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

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Upload usage limit reached",
    });
  });

  it("creates an upload session with trimmed names and normalized checksums", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    userCanEditFolderMock.mockResolvedValue(true);
    getUserUsageOverviewMock.mockResolvedValue({
      upload: {
        totalBalance: 3,
      },
    });
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
});
