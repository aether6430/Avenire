import { beforeEach, describe, expect, it, vi } from "vitest";

const WORKSPACE_UUID = "11111111-1111-4111-8111-111111111111";

const {
  buildRetrievalSummaryEvidenceMock,
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  generateRetrievalSummaryResponseMock,
  getSessionUserMock,
} = vi.hoisted(() => ({
  buildRetrievalSummaryEvidenceMock: vi.fn(),
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  generateRetrievalSummaryResponseMock: vi.fn(),
  getSessionUserMock: vi.fn(),
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

vi.mock("./retrieval-summary-evidence", () => ({
  buildRetrievalSummaryEvidence: buildRetrievalSummaryEvidenceMock,
}));

vi.mock("./retrieval-summary-generation", () => ({
  generateRetrievalSummaryResponse: generateRetrievalSummaryResponseMock,
}));

import { FALLBACK_SUMMARY } from "./retrieval-summary-model";
import { POST } from "./route";

function createApiLoggerStub() {
  return {
    requestFailed: vi.fn(async () => undefined),
    requestStarted: vi.fn(async () => undefined),
    requestSucceeded: vi.fn(async () => undefined),
    warn: vi.fn(async () => undefined),
  };
}

describe("/api/ai/retrieval/summary route", () => {
  beforeEach(() => {
    buildRetrievalSummaryEvidenceMock.mockReset();
    createApiLoggerMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    generateRetrievalSummaryResponseMock.mockReset();
    getSessionUserMock.mockReset();
    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        body: JSON.stringify({}),
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(buildRetrievalSummaryEvidenceMock).not.toHaveBeenCalled();
  });

  it("rejects invalid payloads including whitespace-only queries", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
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
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
  });

  it("requires workspace access before generating a summary", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        body: JSON.stringify({
          query: "What happened?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(buildRetrievalSummaryEvidenceMock).not.toHaveBeenCalled();
  });

  it("returns the fallback summary when no files or matches are provided", async () => {
    const logger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValue(logger);
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        body: JSON.stringify({
          query: "What happened?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: FALLBACK_SUMMARY,
    });
    expect(buildRetrievalSummaryEvidenceMock).not.toHaveBeenCalled();
    expect(logger.requestSucceeded).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        reason: "no-files",
        workspaceUuid: WORKSPACE_UUID,
      })
    );
  });

  it("returns the fallback summary when all requested evidence resolves empty", async () => {
    const logger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValue(logger);
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    buildRetrievalSummaryEvidenceMock.mockResolvedValue({
      attachedFiles: [],
      attemptedFiles: 2,
      textualEvidence: [],
    });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        body: JSON.stringify({
          fileIds: ["22222222-2222-4222-8222-222222222222"],
          query: "What happened?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: FALLBACK_SUMMARY,
    });
    expect(generateRetrievalSummaryResponseMock).not.toHaveBeenCalled();
    expect(logger.requestSucceeded).toHaveBeenCalledWith(
      200,
      expect.objectContaining({
        attemptedFiles: 2,
        reason: "attachments-empty",
        workspaceUuid: WORKSPACE_UUID,
      })
    );
  });

  it("delegates to the summary generator once evidence is available", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    buildRetrievalSummaryEvidenceMock.mockResolvedValue({
      attachedFiles: [
        {
          data: new Uint8Array([1, 2, 3]),
          filename: "diagram.png",
          mediaType: "image/png",
          type: "file",
        },
      ],
      attemptedFiles: 1,
      textualEvidence: ["Document file: Notes (file-1)\nChunk 1: Answer"],
    });
    const generated = new Response("summary ready", {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
      status: 200,
    });
    generateRetrievalSummaryResponseMock.mockResolvedValue(generated);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        body: JSON.stringify({
          fileIds: ["22222222-2222-4222-8222-222222222222"],
          matches: [
            {
              fileId: "33333333-3333-4333-8333-333333333333",
              snippet: "Answer",
              title: "Notes",
            },
          ],
          query: "What happened?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response).toBe(generated);
    expect(generateRetrievalSummaryResponseMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fileIds: [
          "33333333-3333-4333-8333-333333333333",
          "22222222-2222-4222-8222-222222222222",
        ],
        query: "What happened?",
        workspaceUuid: WORKSPACE_UUID,
      })
    );
  });

  it("fails closed with an explicit error when evidence building throws", async () => {
    const logger = createApiLoggerStub();
    createApiLoggerMock.mockReturnValue(logger);
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    buildRetrievalSummaryEvidenceMock.mockRejectedValueOnce(
      new Error("retrieval summary offline")
    );

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        body: JSON.stringify({
          fileIds: ["22222222-2222-4222-8222-222222222222"],
          query: "What happened?",
          workspaceUuid: WORKSPACE_UUID,
        }),
        method: "POST",
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "retrieval summary offline",
    });
    expect(logger.requestFailed).toHaveBeenCalledWith(
      500,
      expect.objectContaining({
        message: "retrieval summary offline",
      })
    );
  });
});
