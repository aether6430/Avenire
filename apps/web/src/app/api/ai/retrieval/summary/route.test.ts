import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  generateTextMock,
  getFileAssetByIdMock,
  getNoteContentMock,
  getSessionUserMock,
  isMarkdownFileRecordMock,
  normalizeMediaTypeMock,
  streamTextMock,
  validateWorkspaceFileCitationsMock,
} = vi.hoisted(() => ({
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  generateTextMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  normalizeMediaTypeMock: vi.fn(),
  streamTextMock: vi.fn(),
  validateWorkspaceFileCitationsMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  apollo: {
    languageModel: vi.fn((model: string) => ({ model })),
  },
  generateText: generateTextMock,
  streamText: streamTextMock,
  validateWorkspaceFileCitations: validateWorkspaceFileCitationsMock,
}));

vi.mock("@/lib/file-data", () => ({
  getFileAssetById: getFileAssetByIdMock,
  getNoteContent: getNoteContentMock,
  isMarkdownFileRecord: isMarkdownFileRecordMock,
}));

vi.mock("@/lib/media-type", () => ({
  normalizeMediaType: normalizeMediaTypeMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { POST } from "./route";

function createApiLoggerStub() {
  return {
    requestStarted: vi.fn(),
    requestFailed: vi.fn(),
    requestSucceeded: vi.fn(),
    warn: vi.fn(),
  };
}

const WORKSPACE_UUID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const FILE_UUID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("/api/ai/retrieval/summary route", () => {
  beforeEach(() => {
    createApiLoggerMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    generateTextMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getNoteContentMock.mockReset();
    getSessionUserMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    normalizeMediaTypeMock.mockReset();
    streamTextMock.mockReset();
    validateWorkspaceFileCitationsMock.mockReset();

    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    validateWorkspaceFileCitationsMock.mockReturnValue({
      valid: true,
      invalidFileIds: [],
    });
    normalizeMediaTypeMock.mockImplementation((value: string | null) => value);
  });

  it("returns unauthorized when there is no signed-in user", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        method: "POST",
        body: JSON.stringify({}),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("returns invalid payload when the request body does not satisfy the schema", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        method: "POST",
        body: JSON.stringify({ workspaceUuid: WORKSPACE_UUID }),
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
  });

  it("returns the fallback summary when no files are provided", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: WORKSPACE_UUID,
          query: "What is this?",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary:
        "I could not find a reliable answer in the matched files. Try narrowing your question or selecting a more specific file.",
    });
  });

  it("uses generateText for non-streaming summaries when accessible evidence exists", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: FILE_UUID,
      mimeType: "text/markdown",
      name: "notes.md",
      storageUrl: "https://example.com/notes.md",
    });
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockResolvedValue({
      content: "# Notes\n\nAnswer lives here.",
    });
    generateTextMock.mockResolvedValue({ text: "A short answer." });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: WORKSPACE_UUID,
          query: "Summarize this",
          fileIds: [FILE_UUID],
        }),
      })
    );

    expect(generateTextMock).toHaveBeenCalledOnce();
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: "A short answer.",
    });
  });

  it("uses streamText for streaming summaries when accessible evidence exists", async () => {
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    getFileAssetByIdMock.mockResolvedValue({
      id: FILE_UUID,
      mimeType: "text/markdown",
      name: "notes.md",
      storageUrl: "https://example.com/notes.md",
    });
    isMarkdownFileRecordMock.mockReturnValue(true);
    getNoteContentMock.mockResolvedValue({
      content: "# Notes\n\nAnswer lives here.",
    });
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () =>
        new Response("streamed answer", {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
          },
        }),
    });

    const response = await POST(
      new Request("http://localhost:3003/api/ai/retrieval/summary", {
        method: "POST",
        body: JSON.stringify({
          workspaceUuid: WORKSPACE_UUID,
          query: "Stream this",
          fileIds: [FILE_UUID],
          stream: true,
        }),
      })
    );

    expect(streamTextMock).toHaveBeenCalledOnce();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe("streamed answer");
    expect(response.headers.get("content-type")).toContain("text/plain");
  });
});
