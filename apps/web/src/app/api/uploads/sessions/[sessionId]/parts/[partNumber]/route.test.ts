import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  getUploadSessionMock,
  verifyUploadSessionPartTokenMock,
  writeMultipartPartMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  getUploadSessionMock: vi.fn(),
  verifyUploadSessionPartTokenMock: vi.fn(),
  writeMultipartPartMock: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/upload-multipart-write", () => ({
  writeMultipartPart: writeMultipartPartMock,
}));

vi.mock("@/lib/upload-session-store", () => ({
  getUploadSession: getUploadSessionMock,
}));

vi.mock("@/lib/upload-session-token", () => ({
  verifyUploadSessionPartToken: verifyUploadSessionPartTokenMock,
}));

import { PUT } from "./route";

function createApiLoggerStub() {
  return {
    info: vi.fn(),
    requestFailed: vi.fn(),
    warn: vi.fn(),
  };
}

function createSession() {
  return {
    id: "session-1",
    userId: "user-1",
    workspaceUuid: "workspace-1",
    createdAt: new Date(Date.now() - 5000).toISOString(),
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
}

describe("/api/uploads/sessions/[sessionId]/parts/[partNumber] route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    getUploadSessionMock.mockReset();
    verifyUploadSessionPartTokenMock.mockReset();
    writeMultipartPartMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    verifyUploadSessionPartTokenMock.mockReturnValue({ ok: true });
  });

  it("returns not found and expired session states", async () => {
    getUploadSessionMock.mockResolvedValueOnce(null);

    let response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/1?token=token-1",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "1",
        }),
      }
    );
    expect(response.status).toBe(404);

    getUploadSessionMock.mockResolvedValueOnce({
      ...createSession(),
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/1?token=token-1",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "1",
        }),
      }
    );
    expect(response.status).toBe(410);
  });

  it("rejects invalid part numbers and missing or invalid tokens", async () => {
    getUploadSessionMock.mockResolvedValue(createSession());

    let response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/not-a-number?token=token-1",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "not-a-number",
        }),
      }
    );
    expect(response.status).toBe(400);

    response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/1",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "1",
        }),
      }
    );
    expect(response.status).toBe(401);

    verifyUploadSessionPartTokenMock.mockReturnValueOnce({
      ok: false,
      reason: "invalid-token",
    });
    response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/1?token=bad-token",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "1",
        }),
      }
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Unauthorized",
      reason: "invalid-token",
    });
  });

  it("returns part too large when multipart storage rejects the chunk size", async () => {
    getUploadSessionMock.mockResolvedValue(createSession());
    writeMultipartPartMock.mockRejectedValue(
      Object.assign(new Error("too large"), {
        code: "UPLOAD_PART_TOO_LARGE",
      })
    );

    const response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/4?token=token-4",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "4",
        }),
      }
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: "Part too large",
      maxPartBytes: 16 * 1024 * 1024,
    });
  });

  it("stores valid multipart chunks and returns etag metadata", async () => {
    getUploadSessionMock.mockResolvedValue(createSession());
    writeMultipartPartMock.mockResolvedValue({
      etag: "etag-1",
      partNumber: 4,
      sizeBytes: 5,
    });

    const response = await PUT(
      new Request(
        "http://localhost:3003/api/uploads/sessions/session-1/parts/4?token=token-4",
        {
          method: "PUT",
          body: "chunk",
        }
      ),
      {
        params: Promise.resolve({
          sessionId: "session-1",
          partNumber: "4",
        }),
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      etag: "etag-1",
      partNumber: 4,
      sizeBytes: 5,
    });
    expect(verifyUploadSessionPartTokenMock).toHaveBeenCalledWith("token-4", {
      sessionId: "session-1",
      workspaceUuid: "workspace-1",
      partNumber: 4,
    });
    expect(writeMultipartPartMock).toHaveBeenCalledWith({
      sessionId: "session-1",
      partNumber: 4,
      maxBytes: 16 * 1024 * 1024,
      stream: expect.any(ReadableStream),
    });
  });
});
