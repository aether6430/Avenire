import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  APOLLO_PROMPT_MOCK,
  apolloLanguageModelMock,
  buildRecentSessionSummaryContextMock,
  clearActiveStreamIdMock,
  convertToModelMessagesMock,
  createChatToolsMock,
  detectMisconceptionSignalsCoreMock,
  detectMisconceptionSignalsMock,
  formatErrorMock,
  getActiveMisconceptionsForDetectorMock,
  getCachedLearningPromptMemoryBlocksMock,
  logErrorMock,
  logInfoMock,
  logWarnMock,
  smoothStreamMock,
  stepCountIsMock,
  streamTextMock,
} = vi.hoisted(() => ({
  APOLLO_LANGUAGE_MODEL_IDS_MOCK: { "apollo-apex": "provider-apollo-apex" },
  APOLLO_PROMPT_MOCK: vi.fn(),
  apolloLanguageModelMock: vi.fn(),
  buildRecentSessionSummaryContextMock: vi.fn(),
  clearActiveStreamIdMock: vi.fn(),
  convertToModelMessagesMock: vi.fn(),
  createChatToolsMock: vi.fn(),
  detectMisconceptionSignalsCoreMock: vi.fn(),
  detectMisconceptionSignalsMock: vi.fn(),
  formatErrorMock: vi.fn((error: unknown) =>
    error instanceof Error ? error.message : String(error)
  ),
  getActiveMisconceptionsForDetectorMock: vi.fn(),
  getCachedLearningPromptMemoryBlocksMock: vi.fn(),
  logErrorMock: vi.fn(),
  logInfoMock: vi.fn(),
  logWarnMock: vi.fn(),
  smoothStreamMock: vi.fn(),
  stepCountIsMock: vi.fn(),
  streamTextMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_LANGUAGE_MODEL_IDS: APOLLO_LANGUAGE_MODEL_IDS_MOCK,
  APOLLO_PROMPT: APOLLO_PROMPT_MOCK,
  apollo: {
    languageModel: apolloLanguageModelMock,
  },
  convertToModelMessages: convertToModelMessagesMock,
  smoothStream: smoothStreamMock,
  stepCountIs: stepCountIsMock,
  streamText: streamTextMock,
}));

vi.mock("@avenire/ai/misconception-signals", () => ({
  detectMisconceptionSignals: detectMisconceptionSignalsCoreMock,
}));

vi.mock("@/lib/chat-tools", () => ({
  createChatTools: createChatToolsMock,
}));

vi.mock("@/lib/learning-data", () => ({
  getActiveMisconceptions: getActiveMisconceptionsForDetectorMock,
}));

vi.mock("@/lib/misconception-signal-detector", () => ({
  detectMisconceptionSignals: detectMisconceptionSignalsMock,
}));

vi.mock("@/lib/session-summaries", () => ({
  buildRecentSessionSummaryContext: buildRecentSessionSummaryContextMock,
}));

vi.mock("./chat-route-cache", () => ({
  getCachedLearningPromptMemoryBlocks: getCachedLearningPromptMemoryBlocksMock,
}));

vi.mock("./chat-route-logging", () => ({
  formatError: formatErrorMock,
  logError: logErrorMock,
  logInfo: logInfoMock,
  logWarn: logWarnMock,
}));

vi.mock("./chat-stream-store", () => ({
  clearActiveStreamId: clearActiveStreamIdMock,
}));

import { createPersistedChatModelStream } from "./chat-route-persisted-model-stream";

const aiPackageFile = resolve(
  import.meta.dirname,
  "../../../../../../packages/ai/package.json"
);
const chatToolsIndexFile = resolve(
  import.meta.dirname,
  "../../../lib/chat-tools/index.ts"
);
const detectorSourceFile = resolve(
  import.meta.dirname,
  "../../../lib/misconception-signal-detector.ts"
);
const flashcardGeneratorSkillFile = resolve(
  import.meta.dirname,
  "../../../../../../packages/ai/skills/sections/study-guidelines/flashcard-generator.md"
);
const generatedSkillsFile = resolve(
  import.meta.dirname,
  "../../../../../../packages/ai/skills/skills.ts"
);

function buildStartupContext(overrides: Record<string, unknown> = {}) {
  return {
    latestUserText: "Explain angular momentum",
    recentRelevantSummary: {
      summaryText: "Reviewed angular momentum.",
      updatedAt: "2026-05-18T00:00:00.000Z",
    },
    resolvedSubject: "Physics",
    resolvedTopic: "Angular momentum",
    workspaceSubjectSummary: {
      subject: "Physics",
    },
    ...overrides,
  } as never;
}

describe("chat route persisted model stream", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convertToModelMessagesMock.mockResolvedValue([{ role: "user" }]);
    getCachedLearningPromptMemoryBlocksMock.mockResolvedValue([
      { content: "Memory block", kind: "subject" },
    ]);
    detectMisconceptionSignalsMock.mockResolvedValue(null);
    buildRecentSessionSummaryContextMock.mockReturnValue(
      "Recent session summary"
    );
    APOLLO_PROMPT_MOCK.mockReturnValue("system prompt");
    apolloLanguageModelMock.mockReturnValue({ providerModel: "apollo-apex" });
    stepCountIsMock.mockReturnValue("stop-after-8");
    smoothStreamMock.mockReturnValue("smooth-transform");
    createChatToolsMock.mockReturnValue({
      note_agent: { description: "allowed" },
      unknown_tool: { description: "blocked" },
    });
    detectMisconceptionSignalsCoreMock.mockResolvedValue({
      candidates: [],
      interventionBlock: null,
      matched: false,
    });
    streamTextMock.mockReturnValue({ id: "result-stream" });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("builds a persisted model stream with filtered tools, prompt memory, and legacy widget config", async () => {
    const apiLogger = {
      requestFailed: vi.fn(),
    };
    const writer = {
      write: vi.fn(),
    };

    const result = await createPersistedChatModelStream({
      apiLogger: apiLogger as never,
      body: {
        selectedModel: "apollo-apex",
        userName: "Avenire User",
      },
      chatSlug: "chat-1",
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      sessionUser: {
        id: "user-1",
        name: "Fallback User",
      },
      startupContext: buildStartupContext(),
      streamId: "stream-1",
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      writer,
    });

    expect(result).toEqual({
      result: { id: "result-stream" },
      selectedModel: "apollo-apex",
    });
    expect(createChatToolsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentActivityId: expect.any(String),
        chatSlug: "chat-1",
        rootFolderId: "root-1",
        userId: "user-1",
        workspaceId: "workspace-1",
      })
    );
    expect(APOLLO_PROMPT_MOCK).toHaveBeenCalledWith("Avenire User", [
      { content: "Memory block", kind: "subject" },
    ]);
    expect(streamTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ role: "user" }],
        tools: { note_agent: { description: "allowed" } },
      })
    );

    const streamArgs = streamTextMock.mock.calls[0]?.[0];
    await streamArgs.onChunk({
      chunk: {
        toolCallId: "call-1",
        toolName: "note_agent",
        type: "tool-call",
      },
    });
    await streamArgs.onChunk({
      chunk: {
        toolCallId: "call-1",
        toolName: "note_agent",
        type: "tool-result",
      },
    });
    expect(logInfoMock).toHaveBeenCalledWith(
      "Streaming tool call chunk",
      expect.objectContaining({ chatId: "chat-1", toolName: "note_agent" })
    );
    expect(logInfoMock).toHaveBeenCalledWith(
      "Streaming tool result chunk",
      expect.objectContaining({ chatId: "chat-1", toolName: "note_agent" })
    );
  });

  it("appends the current-turn misconception intervention block when the detector matches", async () => {
    detectMisconceptionSignalsMock.mockResolvedValue({
      candidates: [],
      interventionBlock: {
        content: "Current-turn misconception signal",
        freshness: "current",
        kind: "misconception",
      },
      matched: true,
    });

    await createPersistedChatModelStream({
      apiLogger: {
        requestFailed: vi.fn(),
      } as never,
      body: {
        selectedModel: "apollo-apex",
      },
      chatSlug: "chat-4",
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      sessionUser: {
        id: "user-1",
      },
      startupContext: buildStartupContext(),
      streamId: "stream-4",
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      writer: {
        write: vi.fn(),
      },
    });

    expect(detectMisconceptionSignalsMock).toHaveBeenCalledWith({
      abortSignal: expect.any(AbortSignal),
      latestUserText: "Explain angular momentum",
      subject: "Physics",
      topic: "Angular momentum",
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(APOLLO_PROMPT_MOCK).toHaveBeenCalledWith(undefined, [
      { content: "Memory block", kind: "subject" },
      {
        content: "Current-turn misconception signal",
        freshness: "current",
        kind: "misconception",
      },
    ]);
  });

  it("falls back when learning prompt memory blocks time out", async () => {
    vi.useFakeTimers();
    getCachedLearningPromptMemoryBlocksMock.mockImplementation(
      () => new Promise(() => undefined)
    );

    const promise = createPersistedChatModelStream({
      apiLogger: {
        requestFailed: vi.fn(),
      } as never,
      body: {
        selectedModel: "apollo-apex",
      },
      chatSlug: "chat-2",
      modelContextMessages: [{ id: "message-1", role: "user" }] as never,
      request: new Request("http://localhost/api/chat"),
      sessionUser: {
        id: "user-1",
      },
      startupContext: buildStartupContext(),
      streamId: "stream-2",
      workspace: {
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
      writer: {
        write: vi.fn(),
      },
    });

    await vi.advanceTimersByTimeAsync(1200);
    await promise;

    expect(logWarnMock).toHaveBeenCalledWith(
      "Startup context timed out; continuing without it",
      expect.objectContaining({
        label: "learning-prompt-memory",
        timeoutMs: 1200,
      })
    );
    expect(APOLLO_PROMPT_MOCK).toHaveBeenCalledWith(undefined, undefined);
  });

  it("keeps the apollo apex provider id and misconception-first prompt guidance aligned with current ai package truth", async () => {
    const actualAi =
      await vi.importActual<typeof import("@avenire/ai")>("@avenire/ai");
    const actualTools =
      await vi.importActual<typeof import("@avenire/ai/tools")>(
        "@avenire/ai/tools"
      );
    const aiPackageSource = readFileSync(aiPackageFile, "utf8");
    const chatToolsIndexSource = readFileSync(chatToolsIndexFile, "utf8");
    const detectorSource = readFileSync(detectorSourceFile, "utf8");
    const flashcardGeneratorSkillSource = readFileSync(
      flashcardGeneratorSkillFile,
      "utf8"
    );
    const generatedSkillsSource = readFileSync(generatedSkillsFile, "utf8");

    expect(actualAi.APOLLO_LANGUAGE_MODEL_IDS["apollo-apex"]).toBe(
      "accounts/fireworks/models/kimi-k2p5"
    );
    expect("legacyShowWidgetInputSchema" in actualTools).toBe(false);
    expect(aiPackageSource).toContain(
      '"./misconception-signals": "./misconception-signals.ts"'
    );
    expect(detectorSource).toContain(
      'from "@avenire/ai/misconception-signals"'
    );
    expect(chatToolsIndexSource).toContain(
      "Generate a persisted Mindset Set from a file, search query, or provided source text."
    );
    expect(chatToolsIndexSource).toContain(
      "Generate a Mindset Set from an active misconception so the user can train the correct model directly."
    );
    expect(chatToolsIndexSource).not.toContain(
      "Generate a persisted mindset set from a file, search query, or provided source text."
    );
    expect(chatToolsIndexSource).not.toContain(
      "Generate a mindset set from an active misconception so the user can train the correct model directly."
    );
    expect(flashcardGeneratorSkillSource).toContain(
      "create the actual persisted Mindset Set"
    );
    expect(flashcardGeneratorSkillSource).not.toContain(
      "create the actual persisted mindset set"
    );
    expect(generatedSkillsSource).toContain(
      "create the actual persisted Mindset Set"
    );
    expect(generatedSkillsSource).not.toContain(
      "create the actual persisted mindset set"
    );

    const prompt = actualAi.APOLLO_PROMPT();

    expect(prompt).toContain(
      "call list_misconceptions near the beginning of the response flow"
    );
    expect(prompt).toContain(
      "This tool is cache-backed and cheap; use it as the default way to inspect active misconceptions."
    );
    expect(prompt).toContain(
      "Use improve_misconception to lower confidence after the user shows partial correction"
    );
    expect(prompt).toContain(
      "When you identify an active misconception in the same topic, check whether relevant cards from that Mindset Set are already due."
    );
    expect(prompt).toContain(
      "Before asking it to update a note, first identify the exact workspace path/path_dir or exact file id"
    );
    expect(prompt).toContain(
      "Do not create new misconceptions from the chat response."
    );
    expect(prompt).toContain(
      "Only generate Mindset Sets or quizzes when the user explicitly asks for flashcards, mindset cards, study cards, or provides study material for that purpose."
    );
    expect(prompt).toContain(
      "When creating a Mindset Set for a topic or misconception, prefer extending the existing Mindset Set for that topic instead of creating a duplicate one."
    );
    expect(prompt).toContain('widget: { type: "spec", spec: ... }');
    expect(prompt).toContain(
      "call the tool directly with the complete final `widget` payload"
    );
    expect(prompt).toContain('widget: { type: "code", code: ... }');
    expect(prompt).not.toContain("widget_spec");
    expect(prompt).not.toContain("widget_code");
    expect(prompt).not.toContain(
      "Use log_misconception when the user clearly reveals a wrong mental model"
    );
    expect(prompt).not.toContain(
      "When you log a misconception or identify an active misconception in the same topic"
    );
  });

  it("reuses cached active misconceptions inside the actual detector for repeated identical signal checks", async () => {
    vi.resetModules();
    vi.stubEnv("COHERE_API_KEY", "cohere-test-key");
    const detectorWorkspaceId = `workspace-cache-${Math.random()
      .toString(36)
      .slice(2)}`;

    getActiveMisconceptionsForDetectorMock.mockResolvedValue([
      {
        concept: "Angular momentum",
        confidence: 0.82,
        id: "mis-1",
        reason: "Treats torque and angular momentum as the same quantity",
        subject: "Physics",
        topic: "Angular momentum",
        updatedAt: "2026-05-18T00:00:00.000Z",
      },
    ]);

    const { detectMisconceptionSignals } = await vi.importActual<
      typeof import("@/lib/misconception-signal-detector")
    >("@/lib/misconception-signal-detector");

    const first = await detectMisconceptionSignals({
      latestUserText: "I think torque is just angular momentum over time.",
      subject: "Physics",
      topic: "Angular momentum",
      userId: "user-1",
      workspaceId: detectorWorkspaceId,
    });
    const second = await detectMisconceptionSignals({
      latestUserText: "I think torque is just angular momentum over time.",
      subject: "Physics",
      topic: "Angular momentum",
      userId: "user-1",
      workspaceId: detectorWorkspaceId,
    });

    expect(first).toEqual({
      candidates: [],
      interventionBlock: null,
      matched: false,
    });
    expect(second).toEqual(first);
    expect(getActiveMisconceptionsForDetectorMock).toHaveBeenCalledTimes(1);
    expect(detectMisconceptionSignalsCoreMock).toHaveBeenCalledTimes(2);
    expect(detectMisconceptionSignalsCoreMock).toHaveBeenCalledWith(
      expect.objectContaining({
        latestUserText: "I think torque is just angular momentum over time.",
        subject: "Physics",
        topic: "Angular momentum",
        misconceptions: [
          expect.objectContaining({
            concept: "Angular momentum",
            subject: "Physics",
            topic: "Angular momentum",
          }),
        ],
      })
    );
  });

  it("clears the active stream id and reports request failure when stream startup throws", async () => {
    const streamError = new Error("stream start failed");
    streamTextMock.mockImplementation(() => {
      throw streamError;
    });
    const apiLogger = {
      requestFailed: vi.fn(),
    };

    await expect(
      createPersistedChatModelStream({
        apiLogger: apiLogger as never,
        body: {
          selectedModel: "apollo-apex",
        },
        chatSlug: "chat-3",
        modelContextMessages: [{ id: "message-1", role: "user" }] as never,
        request: new Request("http://localhost/api/chat"),
        sessionUser: {
          id: "user-1",
        },
        startupContext: buildStartupContext(),
        streamId: "stream-3",
        workspace: {
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        },
        writer: {
          write: vi.fn(),
        },
      })
    ).rejects.toThrow("stream start failed");

    expect(clearActiveStreamIdMock).toHaveBeenCalledWith("chat-3", "stream-3");
    expect(logErrorMock).toHaveBeenCalledWith(
      "Failed to start model stream",
      expect.objectContaining({
        chatId: "chat-3",
        error: streamError,
      })
    );
    expect(apiLogger.requestFailed).toHaveBeenCalledWith(500, streamError, {
      chatId: "chat-3",
    });
  });
});
