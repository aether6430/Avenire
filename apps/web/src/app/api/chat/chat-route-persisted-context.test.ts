import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  formatErrorMock,
  getRecentRelevantSessionSummaryMock,
  getWorkspaceSubjectSummaryMock,
  inferTopicLabelMock,
  logInfoMock,
  logWarnMock,
  normalizeSubjectLabelMock,
} = vi.hoisted(() => ({
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getRecentRelevantSessionSummaryMock: vi.fn(),
  getWorkspaceSubjectSummaryMock: vi.fn(),
  inferTopicLabelMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  normalizeSubjectLabelMock: vi.fn(),
}));

vi.mock("@avenire/database", () => ({
  getRecentRelevantSessionSummary: getRecentRelevantSessionSummaryMock,
}));

vi.mock("@/lib/session-summaries", () => ({
  getWorkspaceSubjectSummary: getWorkspaceSubjectSummaryMock,
}));

vi.mock("@/lib/subject-detection", () => ({
  inferTopicLabel: inferTopicLabelMock,
  normalizeSubjectLabel: normalizeSubjectLabelMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}));

import { loadPersistedChatStartupContext } from "./chat-route-persisted-context";

describe("chat route persisted context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads workspace and recent summary context and derives subject/topic", async () => {
    getWorkspaceSubjectSummaryMock.mockResolvedValue({
      subject: " Physics ",
      summaryText: "Rotation and torque",
    });
    normalizeSubjectLabelMock.mockReturnValue("Physics");
    getRecentRelevantSessionSummaryMock.mockResolvedValue({
      summaryText: "Reviewed angular momentum.",
      updatedAt: "2026-05-18T00:00:00.000Z",
    });
    inferTopicLabelMock.mockReturnValue("Angular momentum");

    const result = await loadPersistedChatStartupContext({
      chatDbId: "chat-db-1",
      chatSlug: "chat-1",
      messages: [
        {
          id: "message-1",
          metadata: undefined,
          parts: [{ text: "How does angular momentum work?", type: "text" }],
          role: "user",
        } as never,
      ],
      modelContextMessages: [
        { id: "message-1", parts: [], role: "user" } as never,
      ],
      selectedModel: "apollo-apex",
      sessionUserId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(result).toMatchObject({
      latestUserText: "How does angular momentum work?",
      recentRelevantSummary: {
        summaryText: "Reviewed angular momentum.",
      },
      resolvedSubject: "Physics",
      resolvedTopic: "Angular momentum",
      workspaceSubjectSummary: {
        subject: " Physics ",
      },
    });
    expect(getRecentRelevantSessionSummaryMock).toHaveBeenCalledWith({
      subject: "Physics",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(logInfoMock).toHaveBeenCalledWith(
      "Incoming chat request",
      expect.objectContaining({
        chatId: "chat-1",
        messageCount: 1,
        modelContextCount: 1,
        resolvedSubject: "Physics",
      })
    );
  });

  it("fails closed when workspace summary loading errors and skips relevant summary lookup without a resolved subject", async () => {
    getWorkspaceSubjectSummaryMock.mockRejectedValue(
      new Error("summary failed")
    );
    normalizeSubjectLabelMock.mockReturnValue(null);
    inferTopicLabelMock.mockReturnValue(null);

    const result = await loadPersistedChatStartupContext({
      chatDbId: "chat-db-1",
      chatSlug: "chat-2",
      messages: [],
      modelContextMessages: [],
      selectedModel: null,
      sessionUserId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(result).toMatchObject({
      latestUserText: "",
      recentRelevantSummary: null,
      resolvedSubject: null,
      resolvedTopic: null,
      workspaceSubjectSummary: null,
    });
    expect(getRecentRelevantSessionSummaryMock).not.toHaveBeenCalled();
    expect(logWarnMock).toHaveBeenCalledWith(
      "Failed to load workspace subject summary; continuing without it",
      expect.objectContaining({
        chatId: "chat-db-1",
        error: "summary failed",
      })
    );
  });

  it("falls back when startup context times out", async () => {
    vi.useFakeTimers();
    getWorkspaceSubjectSummaryMock.mockImplementation(
      () => new Promise(() => undefined)
    );
    normalizeSubjectLabelMock.mockReturnValue(null);
    inferTopicLabelMock.mockReturnValue(null);

    const promise = loadPersistedChatStartupContext({
      chatDbId: "chat-db-1",
      chatSlug: "chat-3",
      messages: [],
      modelContextMessages: [],
      selectedModel: null,
      sessionUserId: "user-1",
      workspaceId: "workspace-1",
    });

    await vi.advanceTimersByTimeAsync(1200);
    const result = await promise;

    expect(result.workspaceSubjectSummary).toBeNull();
    expect(logWarnMock).toHaveBeenCalledWith(
      "Startup context timed out; continuing without it",
      expect.objectContaining({
        label: "workspace-subject-summary",
        timeoutMs: 1200,
      })
    );
  });
});
