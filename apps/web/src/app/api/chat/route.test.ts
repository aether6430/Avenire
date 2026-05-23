import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  authGetSessionMock,
  buildRecentSessionSummaryContextMock,
  clearActiveStreamIdMock,
  consumeChatUnitsMock,
  convertToModelMessagesMock,
  createApiLoggerMock,
  createChatForUserMock,
  createChatToolsMock,
  createResumableStreamContextMock,
  createUIMessageStreamMock,
  createUIMessageStreamResponseMock,
  deleteChatForUserMock,
  generateTextMock,
  getActiveMisconceptionContextMock,
  getActiveStreamIdMock,
  getChatBySlugForUserMock,
  getWritableChatBySlugForUserMock,
  getLatestSessionSummaryForChatMock,
  getMessagesByChatSlugForUserMock,
  getRecentRelevantSessionSummaryMock,
  getRedisClientMock,
  getRedisSubscriberMock,
  getWorkspaceSubjectSummaryMock,
  headersMock,
  inferTopicLabelMock,
  invalidateChatReadCachesMock,
  isChatOwnerForUserMock,
  normalizeSubjectLabelMock,
  persistSessionSummaryForCompletedTurnMock,
  resolveWorkspaceForUserMock,
  saveMessagesForChatSlugMock,
  setActiveStreamIdMock,
  smoothStreamMock,
  stepCountIsMock,
  streamTextMock,
  updateChatForUserMock,
  buildStudentProfileContextMock,
} = vi.hoisted(() => ({
  APOLLO_LANGUAGE_MODEL_IDS_MOCK: { "apollo-apex": "apollo-apex-provider" },
  authGetSessionMock: vi.fn(),
  buildRecentSessionSummaryContextMock: vi.fn(),
  buildStudentProfileContextMock: vi.fn(),
  clearActiveStreamIdMock: vi.fn(),
  consumeChatUnitsMock: vi.fn(),
  convertToModelMessagesMock: vi.fn(),
  createApiLoggerMock: vi.fn(),
  createChatForUserMock: vi.fn(),
  createChatToolsMock: vi.fn(),
  createResumableStreamContextMock: vi.fn(),
  createUIMessageStreamMock: vi.fn(),
  createUIMessageStreamResponseMock: vi.fn(),
  deleteChatForUserMock: vi.fn(),
  generateTextMock: vi.fn(),
  getActiveMisconceptionContextMock: vi.fn(),
  getActiveStreamIdMock: vi.fn(),
  getChatBySlugForUserMock: vi.fn(),
  getWritableChatBySlugForUserMock: vi.fn(),
  getLatestSessionSummaryForChatMock: vi.fn(),
  getMessagesByChatSlugForUserMock: vi.fn(),
  getRecentRelevantSessionSummaryMock: vi.fn(),
  getRedisClientMock: vi.fn(),
  getRedisSubscriberMock: vi.fn(),
  getWorkspaceSubjectSummaryMock: vi.fn(),
  headersMock: vi.fn(),
  inferTopicLabelMock: vi.fn(),
  invalidateChatReadCachesMock: vi.fn(),
  isChatOwnerForUserMock: vi.fn(),
  normalizeSubjectLabelMock: vi.fn(),
  persistSessionSummaryForCompletedTurnMock: vi.fn(),
  resolveWorkspaceForUserMock: vi.fn(),
  saveMessagesForChatSlugMock: vi.fn(),
  setActiveStreamIdMock: vi.fn(),
  smoothStreamMock: vi.fn(),
  stepCountIsMock: vi.fn(),
  streamTextMock: vi.fn(),
  updateChatForUserMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_LANGUAGE_MODEL_IDS: APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  APOLLO_PROMPT: vi.fn(() => "apollo prompt"),
  apollo: {
    languageModel: vi.fn((model: string) => ({ model })),
  },
  convertToModelMessages: convertToModelMessagesMock,
  createUIMessageStream: createUIMessageStreamMock,
  createUIMessageStreamResponse: createUIMessageStreamResponseMock,
  generateText: generateTextMock,
  smoothStream: smoothStreamMock,
  stepCountIs: stepCountIsMock,
  streamText: streamTextMock,
}));

vi.mock("@avenire/auth/server", () => ({
  auth: {
    api: {
      getSession: authGetSessionMock,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

vi.mock("resumable-stream", () => ({
  createResumableStreamContext: createResumableStreamContextMock,
}));

vi.mock("@/lib/billing-metering", () => ({
  consumeChatUnits: consumeChatUnitsMock,
}));

vi.mock("@/lib/chat-data", () => ({
  createChatForUser: createChatForUserMock,
  deleteChatForUser: deleteChatForUserMock,
  getChatBySlugForUser: getChatBySlugForUserMock,
  getMessagesByChatSlugForUser: getMessagesByChatSlugForUserMock,
  getWritableChatBySlugForUser: getWritableChatBySlugForUserMock,
  isChatOwnerForUser: isChatOwnerForUserMock,
  saveMessagesForChatSlug: saveMessagesForChatSlugMock,
  updateChatForUser: updateChatForUserMock,
}));

vi.mock("@/lib/domain-cache", () => ({
  invalidateChatReadCaches: invalidateChatReadCachesMock,
}));

vi.mock("@/lib/chat-tools", () => ({
  createChatTools: createChatToolsMock,
  getActiveMisconceptionContext: getActiveMisconceptionContextMock,
}));

vi.mock("@/lib/file-data", () => ({
  resolveWorkspaceForUser: resolveWorkspaceForUserMock,
}));

vi.mock("@avenire/database", () => ({
  getLatestSessionSummaryForChat: getLatestSessionSummaryForChatMock,
  getRecentRelevantSessionSummary: getRecentRelevantSessionSummaryMock,
}));

vi.mock("@/lib/observability", () => ({
  createApiLogger: createApiLoggerMock,
}));

vi.mock("@/lib/session-summaries", () => ({
  buildRecentSessionSummaryContext: buildRecentSessionSummaryContextMock,
  getWorkspaceSubjectSummary: getWorkspaceSubjectSummaryMock,
  persistSessionSummaryForCompletedTurn:
    persistSessionSummaryForCompletedTurnMock,
}));

vi.mock("@/lib/student-profile", () => ({
  buildStudentProfileContext: buildStudentProfileContextMock,
}));

vi.mock("@/lib/subject-detection", () => ({
  inferTopicLabel: inferTopicLabelMock,
  normalizeSubjectLabel: normalizeSubjectLabelMock,
}));

vi.mock("./chat-stream-store", () => ({
  clearActiveStreamId: clearActiveStreamIdMock,
  getActiveStreamId: getActiveStreamIdMock,
  getRedisClient: getRedisClientMock,
  getRedisSubscriber: getRedisSubscriberMock,
  setActiveStreamId: setActiveStreamIdMock,
}));

vi.mock("@/lib/learning-automation", () => ({}));

import { DELETE, POST } from "./route";

const CHAT_ROUTE_URL = "http://localhost:3003/api/chat";
const AUTHORIZED_SESSION = {
  user: { id: "user-1", name: "Avenire User" },
  session: { activeOrganizationId: "org-1" },
};
const RESOLVED_WORKSPACE = {
  rootFolderId: "root-1",
  workspaceId: "workspace-1",
};

function createApiLoggerStub() {
  return {
    featureUsed: vi.fn(),
    meter: vi.fn(),
    rateLimited: vi.fn(),
    requestFailed: vi.fn(),
    requestStarted: vi.fn(),
    requestSucceeded: vi.fn(),
  };
}

function resetChatRouteMocks() {
  for (const mock of [
    authGetSessionMock,
    buildRecentSessionSummaryContextMock,
    buildStudentProfileContextMock,
    clearActiveStreamIdMock,
    consumeChatUnitsMock,
    convertToModelMessagesMock,
    createApiLoggerMock,
    createChatForUserMock,
    createChatToolsMock,
    createResumableStreamContextMock,
    createUIMessageStreamMock,
    createUIMessageStreamResponseMock,
    deleteChatForUserMock,
    generateTextMock,
    getActiveMisconceptionContextMock,
    getActiveStreamIdMock,
    getChatBySlugForUserMock,
    getWritableChatBySlugForUserMock,
    getLatestSessionSummaryForChatMock,
    getMessagesByChatSlugForUserMock,
    getRecentRelevantSessionSummaryMock,
    getRedisClientMock,
    getRedisSubscriberMock,
    getWorkspaceSubjectSummaryMock,
    headersMock,
    inferTopicLabelMock,
    invalidateChatReadCachesMock,
    isChatOwnerForUserMock,
    normalizeSubjectLabelMock,
    persistSessionSummaryForCompletedTurnMock,
    resolveWorkspaceForUserMock,
    saveMessagesForChatSlugMock,
    setActiveStreamIdMock,
    smoothStreamMock,
    stepCountIsMock,
    streamTextMock,
    updateChatForUserMock,
  ]) {
    mock.mockReset();
  }
}

function chatRouteRequest(
  method: "DELETE" | "POST",
  body?: Record<string, unknown>,
  search = ""
) {
  return new Request(`${CHAT_ROUTE_URL}${search}`, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function mockAuthorizedChatRequest() {
  authGetSessionMock.mockResolvedValue(AUTHORIZED_SESSION);
  resolveWorkspaceForUserMock.mockResolvedValue(RESOLVED_WORKSPACE);
}

async function readErrorResponse(response: Response) {
  return {
    body: await response.json(),
    status: response.status,
  };
}

describe("/api/chat route", () => {
  beforeEach(() => {
    resetChatRouteMocks();

    headersMock.mockResolvedValue(new Headers());
    createApiLoggerMock.mockReturnValue(createApiLoggerStub());
  });

  it("returns unauthorized from POST when there is no signed-in session", async () => {
    authGetSessionMock.mockResolvedValue(null);

    await expect(
      readErrorResponse(
        await POST(chatRouteRequest("POST", { chatId: "new", messages: [] }))
      )
    ).resolves.toEqual({
      body: { error: "Unauthorized" },
      status: 401,
    });
  });

  it("returns a 500 json error from POST when session lookup throws before workspace resolution", async () => {
    authGetSessionMock.mockRejectedValueOnce(new Error("chat session offline"));

    await expect(
      readErrorResponse(
        await POST(chatRouteRequest("POST", { chatId: "new", messages: [] }))
      )
    ).resolves.toEqual({
      body: { error: "Internal server error" },
      status: 500,
    });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
  });

  it.each([
    {
      body: { messages: [] },
      error: "Missing chatId",
      name: "returns missing chatId from POST after auth and workspace resolution",
      prepare: () => {
        mockAuthorizedChatRequest();
      },
      status: 400,
    },
    {
      body: {
        ephemeral: true,
        messages: [],
        selectedModel: "apollo-apex",
      },
      error: "Missing selection image",
      name: "returns a 400 from ephemeral chat when the selection image is missing",
      prepare: () => {
        mockAuthorizedChatRequest();
        consumeChatUnitsMock.mockResolvedValue({
          ok: true,
          retryAfter: null,
        });
      },
      status: 400,
    },
    {
      body: {
        chatId: "chat-404",
        messages: [],
      },
      error: "Method not found",
      name: "returns 404 from persisted chat when the requested chat does not exist",
      prepare: () => {
        mockAuthorizedChatRequest();
        getWritableChatBySlugForUserMock.mockResolvedValue(null);
      },
      status: 404,
    },
  ])("$name", async ({ body, error, prepare, status }) => {
    prepare();

    await expect(
      readErrorResponse(await POST(chatRouteRequest("POST", body)))
    ).resolves.toEqual({
      body: { error },
      status,
    });
  });

  it("treats session-close for a new or empty chat as an ignored 202", async () => {
    mockAuthorizedChatRequest();

    const response = await POST(
      chatRouteRequest("POST", {
        kind: "session-close",
        chatId: "new",
        sessionId: "session-1",
      })
    );

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true, ignored: true });
  });

  it("returns missing chat id from DELETE when the query param is absent", async () => {
    authGetSessionMock.mockResolvedValue(AUTHORIZED_SESSION);

    await expect(
      readErrorResponse(await DELETE(chatRouteRequest("DELETE")))
    ).resolves.toEqual({
      body: { error: "Missing chat id" },
      status: 400,
    });
  });

  it("returns a 500 json error from DELETE when session lookup throws before chat deletion", async () => {
    authGetSessionMock.mockRejectedValueOnce(new Error("chat delete offline"));

    await expect(
      readErrorResponse(await DELETE(chatRouteRequest("DELETE")))
    ).resolves.toEqual({
      body: { error: "Internal server error" },
      status: 500,
    });
    expect(resolveWorkspaceForUserMock).not.toHaveBeenCalled();
    expect(deleteChatForUserMock).not.toHaveBeenCalled();
  });
});
