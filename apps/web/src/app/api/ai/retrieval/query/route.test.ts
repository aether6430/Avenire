import { beforeEach, describe, expect, it, vi } from "vitest";

const WORKSPACE_UUID = "11111111-1111-4111-8111-111111111111";

const {
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  getSessionUserMock,
  retrieveWorkspaceChunksSharedMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  retrieveWorkspaceChunksSharedMock: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/retrieval-service", () => ({
  retrieveWorkspaceChunksShared: retrieveWorkspaceChunksSharedMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

function createApiLoggerStub() {
  return {
    requestFailed: vi.fn(async () => undefined),
    requestStarted: vi.fn(async () => undefined),
    requestSucceeded: vi.fn(async () => undefined),
  };
}

describe("/api/ai/retrieval/query route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    retrieveWorkspaceChunksSharedMock.mockReset();
    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("starts request logging before session lookup so auth failures still have request context", async () => {
    const events: string[] = [];
    createApiLoggerMock.mockImplementation(() => {
      events.push("logger");
      return {
        requestFailed: vi.fn(async () => {
          events.push("failed");
        }),
        requestStarted: vi.fn(async () => {
          events.push("started");
        }),
        requestSucceeded: vi.fn(async () => {
          events.push("succeeded");
        }),
      };
    });
    getSessionUserMock.mockImplementation(async () => {
      events.push("session");
      return null;
    });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    expect(events).toEqual(["logger", "started", "session", "failed"]);
  });

  it("fails closed with an explicit error when session lookup throws before payload parsing begins", async () => {
    const logger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValue(logger);
    getSessionUserMock.mockRejectedValueOnce(
      new Error("retrieval auth offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "retrieval auth offline",
    });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(retrieveWorkspaceChunksSharedMock).not.toHaveBeenCalled();
    expect(logger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "retrieval auth offline",
      })
    );
  });

  it("rejects invalid payloads including whitespace-only queries", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({
          query: "   ",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("requires workspace access before running retrieval", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({
          query: "What is this?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
  });

  it("fails closed with an explicit error when workspace access lookup throws before retrieval begins", async () => {
    const logger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValue(logger);
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockRejectedValueOnce(
      new Error("retrieval access offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({
          query: "What is this?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "retrieval access offline",
    });
    expect(retrieveWorkspaceChunksSharedMock).not.toHaveBeenCalled();
    expect(logger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "retrieval access offline",
      })
    );
  });

  it("returns retrieval results with cache headers and normalized payload values", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    retrieveWorkspaceChunksSharedMock.mockResolvedValue({
      cache: "hit",
      latencyMs: 12,
      results: [{ fileId: "file-1" }],
    });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({
          limit: 5,
          mode: "full",
          provider: "  apollo  ",
          query: "  explain this  ",
          sourceType: "markdown",
          workspaceUuid: ` ${WORKSPACE_UUID} `,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      cache: "hit",
      latencyMs: 12,
      results: [{ fileId: "file-1" }],
    });
    expect(response.headers.get("x-rag-cache")).toBe("hit");
    expect(ensureWorkspaceAccessForUserMock).toHaveBeenCalledWith(
      "user-1",
      WORKSPACE_UUID
    );
    expect(retrieveWorkspaceChunksSharedMock).toHaveBeenCalledWith({
      limit: 5,
      mode: "full",
      origin: "api",
      provider: "apollo",
      query: "explain this",
      sourceType: "markdown",
      userId: "user-1",
      workspaceId: WORKSPACE_UUID,
    });
  });

  it("fails closed with an explicit error when retrieval throws", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    retrieveWorkspaceChunksSharedMock.mockRejectedValue(new Error("boom"));

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/query", {
        body: JSON.stringify({
          query: "Explain this",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "boom",
    });
  });
});
