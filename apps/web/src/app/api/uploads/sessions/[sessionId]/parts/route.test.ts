import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  createUploadSessionPartTokenMock,
  getSessionUserMock,
  getUploadSessionMock,
  saveUploadSessionMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  createUploadSessionPartTokenMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  getUploadSessionMock: vi.fn(),
  saveUploadSessionMock: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/upload-session-store", () => ({
  getUploadSession: getUploadSessionMock,
  saveUploadSession: saveUploadSessionMock,
}));

vi.mock("@/lib/upload-session-token", () => ({
  createUploadSessionPartToken: createUploadSessionPartTokenMock,
}));

vi.mock("@/lib/workspace", () => ({
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

function createSession() {
  return {
    id: "session-1",
    userId: "user-1",
    workspaceUuid: "workspace-1",
    createdAt: new Date(Date.now() - 1000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    status: "created",
  };
}

describe("/api/uploads/sessions/[sessionId]/parts route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    createUploadSessionPartTokenMock.mockReset();
    getSessionUserMock.mockReset();
    getUploadSessionMock.mockReset();
    saveUploadSessionMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    createUploadSessionPartTokenMock.mockImplementation(
      ({ partNumber }: { partNumber: number }) => `token-${partNumber}`
    );
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts",
        {
          method: "POST",
          body: JSON.stringify({ partNumbers: [1] }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns not found, forbidden, and expired session states", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    getUploadSessionMock.mockResolvedValueOnce(null);
    let response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts",
        {
          method: "POST",
          body: JSON.stringify({ partNumbers: [1] }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );
    expect(response.status).toBe(404);

    getUploadSessionMock.mockResolvedValueOnce({
      ...createSession(),
      userId: "other-user",
    });
    response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts",
        {
          method: "POST",
          body: JSON.stringify({ partNumbers: [1] }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );
    expect(response.status).toBe(403);

    getUploadSessionMock.mockResolvedValueOnce({
      ...createSession(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts",
        {
          method: "POST",
          body: JSON.stringify({ partNumbers: [1] }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );
    expect(response.status).toBe(410);
  });

  it("rejects invalid multipart part payloads", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(createSession());

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts",
        {
          method: "POST",
          body: JSON.stringify({ partNumbers: [] }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("marks the session uploading and returns signed part upload URLs", async () => {
    const session = createSession();
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    getUploadSessionMock.mockResolvedValue(session);
    saveUploadSessionMock.mockResolvedValue({
      ...session,
      status: "uploading",
    });

    const response = await POST(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts",
        {
          method: "POST",
          body: JSON.stringify({ partNumbers: [1, 3] }),
        }
      ),
      { params: Promise.resolve({ sessionId: "session-1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      session: {
        ...session,
        status: "uploading",
      },
      mode: "session-multipart",
      maxPartBytes: 16 * 1024 * 1024,
      parts: [
        {
          expiresInSeconds: 15 * 60,
          method: "PUT",
          partNumber: 1,
          uploadUrl:
            "http://localhost:3003/api/uploads/sessions/session-1/parts/1?token=token-1",
        },
        {
          expiresInSeconds: 15 * 60,
          method: "PUT",
          partNumber: 3,
          uploadUrl:
            "http://localhost:3003/api/uploads/sessions/session-1/parts/3?token=token-3",
        },
      ],
      message:
        "Upload each part using PUT to the provided uploadUrl. Call /complete once all parts are uploaded.",
    });
    expect(saveUploadSessionMock).toHaveBeenCalledWith({
      ...session,
      status: "uploading",
    });
    expect(createUploadSessionPartTokenMock).toHaveBeenNthCalledWith(1, {
      userId: "user-1",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 1,
      ttlSeconds: 15 * 60,
    });
    expect(createUploadSessionPartTokenMock).toHaveBeenNthCalledWith(2, {
      userId: "user-1",
      workspaceUuid: "workspace-1",
      sessionId: "session-1",
      partNumber: 3,
      ttlSeconds: 15 * 60,
    });
  });
});
