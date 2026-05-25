import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const {
  createSessionSummaryMock,
  generateTextMock,
  languageModelMock,
  listSessionSummariesForUserMock,
  logInfoMock,
  recomputeConceptMasteryMock,
  upsertMisconceptionMock,
} = vi.hoisted(() => ({
  createSessionSummaryMock: vi.fn(),
  generateTextMock: vi.fn(),
  languageModelMock: vi.fn(() => "apollo-sprint"),
  listSessionSummariesForUserMock: vi.fn(),
  logInfoMock: vi.fn(),
  recomputeConceptMasteryMock: vi.fn(),
  upsertMisconceptionMock: vi.fn(),
}));

vi.mock("@avenire/ai", () => ({
  generateText: generateTextMock,
  Output: {
    object: ({ schema }: { schema: unknown }) => schema,
  },
}));

vi.mock("@avenire/ai/models", () => ({
  apollo: {
    languageModel: languageModelMock,
  },
}));

vi.mock("@avenire/database", () => ({
  canonicalizeLearningTaxonomy: vi.fn(() => null),
  canonicalizeSubjectLabel: vi.fn((value: string | null | undefined) =>
    typeof value === "string" ? value.trim() : null
  ),
  createSessionSummary: createSessionSummaryMock,
  listSessionSummariesForUser: listSessionSummariesForUserMock,
  recomputeConceptMastery: recomputeConceptMasteryMock,
  upsertMisconception: upsertMisconceptionMock,
}));

vi.mock("@avenire/observability", () => ({
  logInfo: logInfoMock,
}));

vi.mock("@/lib/ai-provider-errors", () => ({
  isAiProviderConfigurationError: vi.fn(
    (error: { code?: string }) => error?.code === "PROVIDER_NOT_CONFIGURED"
  ),
}));

const sessionSummaryModelSource = readFileSync(
  resolve(import.meta.dirname, "session-summary-model.ts"),
  "utf8"
);
const sessionSummaryRuntimeSource = readFileSync(
  resolve(import.meta.dirname, "session-summary-runtime.ts"),
  "utf8"
);

import type { UIMessage } from "@avenire/ai/message-types";
import {
  getWorkspaceSubjectSummary,
  persistSessionSummaryForCompletedTurn,
} from "@/lib/session-summary-runtime";

function buildMessage(message: Partial<UIMessage>): UIMessage {
  return {
    id: "m-1",
    metadata: undefined,
    parts: [],
    role: "user",
    ...message,
  } as UIMessage;
}

describe("session summary runtime", () => {
  beforeEach(() => {
    createSessionSummaryMock.mockReset();
    generateTextMock.mockReset();
    listSessionSummariesForUserMock.mockReset();
    logInfoMock.mockReset();
    recomputeConceptMasteryMock.mockReset();
    upsertMisconceptionMock.mockReset();
  });

  it("skips trivial sessions and persists learning sessions", async () => {
    const trivial = await persistSessionSummaryForCompletedTurn({
      chatId: "chat-1",
      endedAt: new Date("2026-05-17T10:05:00.000Z"),
      latestSummary: null,
      latestUserPosition: 0,
      messages: [buildMessage({ parts: [{ text: "hi", type: "text" }] })],
      previousLastMessageAt: null,
      requestStartedAt: new Date("2026-05-17T10:00:00.000Z"),
      userId: "user-1",
      workspaceId: "workspace-1",
    });
    expect(trivial).toBeNull();

    generateTextMock.mockResolvedValue({
      output: {
        conceptsCovered: ["Momentum"],
        memoryRelevance: "learning",
        misconceptionCandidates: [
          {
            confidence: 0.8,
            concept: "Momentum",
            reason: "Thinks momentum disappears",
            subject: "Physics",
            topic: "Collisions",
          },
        ],
        misconceptionsDetected: ["Momentum disappears"],
        relevanceReason: "learning",
        subject: "Physics",
        subjectConfidence: 0.8,
        summaryText: "Reviewed momentum conservation.",
      },
    });
    createSessionSummaryMock.mockResolvedValue({
      id: "summary-1",
      subject: "Physics",
    });
    upsertMisconceptionMock.mockResolvedValue({
      concept: "Momentum",
      status: "confirmed",
      subject: "Physics",
      topic: "Collisions",
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    const summary = await persistSessionSummaryForCompletedTurn({
      chatId: "chat-1",
      endedAt: new Date("2026-05-17T10:05:00.000Z"),
      latestSummary: null,
      latestUserPosition: 0,
      messages: [
        buildMessage({
          parts: [
            {
              text: "I thought momentum disappears in collisions.",
              type: "text",
            },
          ],
        }),
        buildMessage({
          role: "assistant",
          parts: [{ text: "Momentum is conserved.", type: "text" }],
        }),
      ],
      previousLastMessageAt: null,
      requestStartedAt: new Date("2026-05-17T10:00:00.000Z"),
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(createSessionSummaryMock).toHaveBeenCalled();
    expect(upsertMisconceptionMock).toHaveBeenCalled();
    expect(recomputeConceptMasteryMock).toHaveBeenCalled();
    expect(summary).toEqual({ id: "summary-1", subject: "Physics" });
  });

  it("skips persistence when the provider is not configured", async () => {
    generateTextMock.mockRejectedValue({ code: "PROVIDER_NOT_CONFIGURED" });

    const result = await persistSessionSummaryForCompletedTurn({
      chatId: "chat-1",
      endedAt: new Date("2026-05-17T10:05:00.000Z"),
      latestSummary: null,
      latestUserPosition: 0,
      messages: [
        buildMessage({
          parts: [{ text: "Explain momentum conservation.", type: "text" }],
        }),
        buildMessage({
          role: "assistant",
          parts: [{ text: "Let me check that.", type: "text" }],
        }),
      ],
      previousLastMessageAt: null,
      requestStartedAt: new Date("2026-05-17T10:00:00.000Z"),
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(result).toBeNull();
    expect(createSessionSummaryMock).not.toHaveBeenCalled();
  });

  it("returns the best subject summary from recent summaries", async () => {
    listSessionSummariesForUserMock.mockResolvedValue([
      { subject: null, subjectConfidence: 0.1 },
      { subject: "Physics", subjectConfidence: 0.8 },
    ]);

    const summary = await getWorkspaceSubjectSummary({
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(summary?.subject).toBe("Physics");
  });

  it("keeps session summaries split between pure model helpers and ai/database runtime work", () => {
    expect(sessionSummaryModelSource).toContain(
      "export function buildTranscript"
    );
    expect(sessionSummaryModelSource).toContain(
      "export function resolveSessionWindow"
    );
    expect(sessionSummaryModelSource).not.toContain("generateText(");
    expect(sessionSummaryModelSource).not.toContain("createSessionSummary(");

    expect(sessionSummaryRuntimeSource).toContain("generateText");
    expect(sessionSummaryRuntimeSource).toContain("createSessionSummary");
    expect(sessionSummaryRuntimeSource).toContain("upsertMisconception");
    expect(sessionSummaryRuntimeSource).toContain("buildTranscript");
    expect(sessionSummaryRuntimeSource).toContain("resolveSessionWindow");
  });
});
