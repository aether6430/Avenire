import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  apolloLanguageModelMock,
  createApiLoggerMock,
  ensureWorkspaceAccessForUserMock,
  fetchMock,
  generateTextMock,
  getFileAssetByIdMock,
  getNoteContentMock,
  getSessionUserMock,
  isMarkdownFileRecordMock,
  streamTextMock,
  toTextStreamResponseMock,
  validateWorkspaceFileCitationsMock,
} = vi.hoisted(() => ({
  apolloLanguageModelMock: vi.fn(),
  createApiLoggerMock: vi.fn(),
  ensureWorkspaceAccessForUserMock: vi.fn(),
  fetchMock: vi.fn(),
  generateTextMock: vi.fn(),
  getFileAssetByIdMock: vi.fn(),
  getNoteContentMock: vi.fn(),
  getSessionUserMock: vi.fn(),
  isMarkdownFileRecordMock: vi.fn(),
  streamTextMock: vi.fn(),
  toTextStreamResponseMock: vi.fn(),
  validateWorkspaceFileCitationsMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  apollo: {
    languageModel: apolloLanguageModelMock,
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

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/workspace", () => ({
  ensureWorkspaceAccessForUser: ensureWorkspaceAccessForUserMock,
  getSessionUser: getSessionUserMock,
}));

import { POST, readResponseBytesWithLimit } from "./route";

const ACCESSIBLE_FILE_ID = "22222222-2222-4222-8222-222222222222";
const INACCESSIBLE_FILE_ID = "33333333-3333-4333-8333-333333333333";
const WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const FALLBACK_SUMMARY =
  "I could not find a reliable answer in the matched files. Try narrowing your question or selecting a more specific file.";

type SummarySourceType =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "markdown"
  | "link";

interface SummaryMatchInput {
  fileId: string;
  snippet?: string;
  sourceType?: SummarySourceType;
  title?: string;
}

interface SummaryRequestBody {
  fileIds?: string[];
  matches?: SummaryMatchInput[];
  query: string;
  stream?: boolean;
  workspaceUuid: string;
}

interface MockFileRecord {
  createdAt: string;
  folderId: string;
  id: string;
  mimeType: string | null;
  name: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
  updatedAt: string;
  updatedBy: string | null;
  uploadedBy: string;
  workspaceId: string;
}

interface ModelTextPart {
  text: string;
  type: "text";
}

interface ModelRequest {
  messages: Array<{
    content: ModelTextPart[];
  }>;
}

function createApiLoggerStub() {
  return {
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
    warn: vi.fn(),
  };
}

function buildFileRecord(overrides: Partial<MockFileRecord>): MockFileRecord {
  return {
    createdAt: "2026-06-11T00:00:00.000Z",
    folderId: "folder-1",
    id: ACCESSIBLE_FILE_ID,
    mimeType: "application/pdf",
    name: "verified-source.pdf",
    sizeBytes: 1024,
    storageKey: "file-key",
    storageUrl: "https://files.example/verified-source.pdf",
    updatedAt: "2026-06-11T00:00:00.000Z",
    updatedBy: null,
    uploadedBy: "user-1",
    workspaceId: WORKSPACE_ID,
    ...overrides,
  };
}

function postSummary(body: Partial<SummaryRequestBody>) {
  return POST(
    new Request("http://localhost:3003/api/ai/retrieval/summary", {
      body: JSON.stringify(body),
      method: "POST",
    })
  );
}

function postSummaryRaw(body: string) {
  return POST(
    new Request("http://localhost:3003/api/ai/retrieval/summary", {
      body,
      method: "POST",
    })
  );
}

function getModelPrompt(mock: typeof generateTextMock | typeof streamTextMock) {
  const request = mock.mock.calls.at(-1)?.[0] as ModelRequest | undefined;
  const textPart = request?.messages[0]?.content.find(
    (part) => part.type === "text"
  );
  if (!textPart) {
    throw new Error("Expected model prompt text part");
  }
  return textPart.text;
}

describe("/api/ai/retrieval/summary route", () => {
  beforeEach(() => {
    apolloLanguageModelMock.mockReset();
    createApiLoggerMock.mockReset();
    ensureWorkspaceAccessForUserMock.mockReset();
    fetchMock.mockReset();
    generateTextMock.mockReset();
    getFileAssetByIdMock.mockReset();
    getNoteContentMock.mockReset();
    getSessionUserMock.mockReset();
    isMarkdownFileRecordMock.mockReset();
    streamTextMock.mockReset();
    toTextStreamResponseMock.mockReset();
    validateWorkspaceFileCitationsMock.mockReset();

    apolloLanguageModelMock.mockReturnValue("apollo-sprint-model");
    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
    ensureWorkspaceAccessForUserMock.mockResolvedValue(true);
    fetchMock.mockResolvedValue(new Response(null, { status: 404 }));
    generateTextMock.mockResolvedValue({ text: "Accessible summary" });
    getSessionUserMock.mockResolvedValue({ id: "user-1" });
    isMarkdownFileRecordMock.mockReturnValue(false);
    toTextStreamResponseMock.mockReturnValue(
      new Response("stream summary", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
    streamTextMock.mockReturnValue({
      toTextStreamResponse: toTextStreamResponseMock,
    });
    validateWorkspaceFileCitationsMock.mockReturnValue({
      invalidFileIds: [],
      valid: true,
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("rejects malformed JSON before checking workspace access", async () => {
    const response = await postSummaryRaw("{");

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
  });

  it("rejects whitespace-only summary queries", async () => {
    const response = await postSummary({
      query: "   ",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(400);
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
  });

  it("stops reading a streamed attachment once it exceeds the byte limit", async () => {
    const response = new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new Uint8Array([1, 2, 3, 4]));
          controller.enqueue(new Uint8Array([5, 6, 7, 8]));
          controller.close();
        },
      })
    );

    await expect(readResponseBytesWithLimit(response, 6)).resolves.toBeNull();
  });

  it("skips known oversized attachments without fetching them", async () => {
    vi.stubEnv("RETRIEVAL_SUMMARY_ATTACHMENT_MAX_BYTES", "256000");
    getFileAssetByIdMock.mockResolvedValue(
      buildFileRecord({
        mimeType: "image/png",
        sizeBytes: 300_000,
      })
    );

    const response = await postSummary({
      matches: [
        {
          fileId: ACCESSIBLE_FILE_ID,
          sourceType: "image",
        },
      ],
      query: "Describe this image",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: FALLBACK_SUMMARY,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
  });

  it("returns unauthorized without fetching files or calling the model", async () => {
    getSessionUserMock.mockResolvedValue(null);

    const response = await postSummary({});

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
    expect(ensureWorkspaceAccessForUserMock).not.toHaveBeenCalled();
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("returns forbidden without fetching files or calling the model", async () => {
    ensureWorkspaceAccessForUserMock.mockResolvedValue(false);

    const response = await postSummary({
      query: "What does the source say?",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Forbidden" });
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("falls back without calling the model when only client snippets are inaccessible", async () => {
    getFileAssetByIdMock.mockResolvedValue(null);

    const response = await postSummary({
      matches: [
        {
          fileId: INACCESSIBLE_FILE_ID,
          snippet: "Fabricated private snippet",
          sourceType: "pdf",
          title: "Fabricated Source",
        },
      ],
      query: "What does the source say?",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: FALLBACK_SUMMARY,
    });
    expect(getFileAssetByIdMock).toHaveBeenCalledWith(
      WORKSPACE_ID,
      INACCESSIBLE_FILE_ID
    );
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
    expect(validateWorkspaceFileCitationsMock).not.toHaveBeenCalled();
  });

  it("filters inaccessible snippets and keeps accessible evidence in the prompt", async () => {
    getFileAssetByIdMock.mockImplementation(
      async (_workspaceId: string, fileId: string) =>
        fileId === ACCESSIBLE_FILE_ID
          ? buildFileRecord({
              id: ACCESSIBLE_FILE_ID,
              name: "server-verified.pdf",
            })
          : null
    );

    const response = await postSummary({
      matches: [
        {
          fileId: INACCESSIBLE_FILE_ID,
          snippet: "Fabricated inaccessible snippet",
          sourceType: "pdf",
          title: "Client-only title",
        },
        {
          fileId: ACCESSIBLE_FILE_ID,
          snippet: "Verified accessible snippet",
          sourceType: "pdf",
          title: "Client supplied accessible title",
        },
      ],
      query: "What evidence is available?",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      summary: "Accessible summary",
    });
    expect(generateTextMock).toHaveBeenCalledTimes(1);
    const prompt = getModelPrompt(generateTextMock);
    expect(prompt).toContain("Verified accessible snippet");
    expect(prompt).toContain(`server-verified.pdf (${ACCESSIBLE_FILE_ID})`);
    expect(prompt).not.toContain("Fabricated inaccessible snippet");
    expect(prompt).not.toContain("Client-only title");
    expect(prompt).not.toContain("Client supplied accessible title");
  });

  it("validates model citations against accessible file ids only", async () => {
    getFileAssetByIdMock.mockImplementation(
      async (_workspaceId: string, fileId: string) =>
        fileId === ACCESSIBLE_FILE_ID ? buildFileRecord({}) : null
    );
    generateTextMock.mockResolvedValue({
      text: `Uses one source [file:${ACCESSIBLE_FILE_ID}] and ignores [file:${INACCESSIBLE_FILE_ID}].`,
    });

    const response = await postSummary({
      fileIds: [INACCESSIBLE_FILE_ID],
      matches: [
        {
          fileId: ACCESSIBLE_FILE_ID,
          snippet: "Verified accessible snippet",
          sourceType: "pdf",
        },
      ],
      query: "What evidence is available?",
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(200);
    expect(validateWorkspaceFileCitationsMock).toHaveBeenCalledWith({
      allowedFileIds: [ACCESSIBLE_FILE_ID],
      text: `Uses one source [file:${ACCESSIBLE_FILE_ID}] and ignores [file:${INACCESSIBLE_FILE_ID}].`,
    });
  });

  it("rejects invalid payloads", async () => {
    const response = await postSummary({
      query: "What does the source say?",
      workspaceUuid: "not-a-uuid",
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid payload",
    });
    expect(getFileAssetByIdMock).not.toHaveBeenCalled();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("filters the streamed prompt through accessible file records", async () => {
    getFileAssetByIdMock.mockImplementation(
      async (_workspaceId: string, fileId: string) =>
        fileId === ACCESSIBLE_FILE_ID ? buildFileRecord({}) : null
    );

    const response = await postSummary({
      matches: [
        {
          fileId: ACCESSIBLE_FILE_ID,
          snippet: "Stream-safe snippet",
          sourceType: "pdf",
        },
        {
          fileId: INACCESSIBLE_FILE_ID,
          snippet: "Stream should not include this",
          sourceType: "pdf",
        },
      ],
      query: "Stream this summary",
      stream: true,
      workspaceUuid: WORKSPACE_ID,
    });

    expect(response.status).toBe(200);
    expect(streamTextMock).toHaveBeenCalledTimes(1);
    expect(generateTextMock).not.toHaveBeenCalled();
    const prompt = getModelPrompt(streamTextMock);
    expect(prompt).toContain("Stream-safe snippet");
    expect(prompt).not.toContain("Stream should not include this");
  });
});
