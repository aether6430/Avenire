import { beforeEach, describe, expect, it, vi } from "vitest";

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

const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";

function createApiLoggerStub() {
  return {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function postQuery(body: unknown) {
  return postQueryRaw(JSON.stringify(body));
}

function postQueryRaw(body: string) {
  return POST(
    new Request("http://localhost:3003/api/ai/retrieval/query", {
      body,
      method: "POST",
    })
  );
}

describe("/api/ai/retrieval/query route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    getSessionUserMock.mockReset();
    retrieveWorkspaceChunksSharedMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    retrieveWorkspaceChunksSharedMock.mockResolvedValue({
      cache: "miss",
      latencyMs: 12,
      results: [],
    });
  });

  it("checks authentication before reading the request body", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await postQueryRaw("{");

    expect(response.status).toBe(401);
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(retrieveWorkspaceChunksSharedMock).not.toHaveBeenCalled();
  });

  it.each([
    ["malformed JSON", "{", "invalid-json"],
    [
      "a whitespace-only query",
      JSON.stringify({ query: "   ", workspaceUuid: WORKSPACE_ID }),
      "invalid-payload",
    ],
    [
      "an invalid workspace UUID",
      JSON.stringify({ query: "mitosis", workspaceUuid: "workspace-1" }),
      "invalid-payload",
    ],
    [
      "an unsupported source type",
      JSON.stringify({
        query: "mitosis",
        sourceType: "spreadsheet",
        workspaceUuid: WORKSPACE_ID,
      }),
      "invalid-payload",
    ],
    [
      "an excessive result limit",
      JSON.stringify({
        limit: 51,
        query: "mitosis",
        workspaceUuid: WORKSPACE_ID,
      }),
      "invalid-payload",
    ],
  ])("rejects %s", async (_label, body, reason) => {
    const response = await postQueryRaw(body);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(retrieveWorkspaceChunksSharedMock).not.toHaveBeenCalled();
    const logger = createApiLoggerMock.mock.results[0]?.value;
    expect(logger.requestFailed).toHaveBeenCalledWith(400, "Invalid payload", {
      reason,
    });
  });

  it("rejects a workspace the user cannot access", async () => {
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await postQuery({
      query: "mitosis",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(403);
    expect(retrieveWorkspaceChunksSharedMock).not.toHaveBeenCalled();
  });

  it("does not expose retrieval service failures", async () => {
    retrieveWorkspaceChunksSharedMock.mockRejectedValue(
      new Error("database connection details")
    );

    const response = await postQuery({
      query: "mitosis",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to query retrieval index",
    });
  });

  it("normalizes input and returns the cache result header", async () => {
    retrieveWorkspaceChunksSharedMock.mockResolvedValue({
      cache: "hit",
      latencyMs: 3,
      results: [{ chunkId: "chunk-1", content: "Cell division" }],
    });

    const response = await postQuery({
      limit: 10,
      provider: "  lecture-notes  ",
      query: "  mitosis  ",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-rag-cache")).toBe("hit");
    expect(retrieveWorkspaceChunksSharedMock).toHaveBeenCalledWith({
      limit: 10,
      mode: undefined,
      origin: "api",
      provider: "lecture-notes",
      query: "mitosis",
      sourceType: undefined,
      userId: "user-1",
      workspaceId: WORKSPACE_ID,
    });
  });
});
