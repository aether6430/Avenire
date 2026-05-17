import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/database", () => ({
  canonicalizeSubjectLabel: vi.fn((value: string | null | undefined) =>
    typeof value === "string" ? value.trim() : null
  ),
  canonicalizeLearningTaxonomy: vi.fn(() => null),
}));

import type { UIMessage } from "@avenire/ai/message-types";
import {
  buildRecentSessionSummaryContext,
  buildTranscript,
  detectConfusionSignals,
  extractFlashcardsCreated,
  extractMisconceptions,
  normalizeMisconceptionCandidate,
  resolveSessionWindow,
  sanitizeAssistantSummaryText,
} from "@/lib/session-summary-model";

function buildMessage(message: Partial<UIMessage>): UIMessage {
  return {
    id: "m-1",
    metadata: undefined,
    parts: [],
    role: "user",
    ...message,
  } as UIMessage;
}

describe("session summary model", () => {
  it("normalizes misconception candidates within bounds", () => {
    const candidate = normalizeMisconceptionCandidate(
      {
        confidence: 1.5,
        concept: " Momentum ",
        reason: " Threw away conservation. ",
        subject: " Physics ",
        topic: " Collisions ",
      },
      {
        sessionSubject: "Physics",
        transcript: "Momentum is conserved.",
      }
    );

    expect(candidate.confidence).toBe(1);
    expect(candidate.concept).toBe("Momentum");
    expect(candidate.subject).toBe("Physics");
  });

  it("strips assistant meta lines and detects confusion signals", () => {
    expect(
      sanitizeAssistantSummaryText(
        "The assistant should do x\nKey findings\nActual answer"
      )
    ).toBe("Actual answer");

    const signals = detectConfusionSignals(
      "I thought momentum disappears, but now I'm confused."
    );
    expect(signals.detected).toBe(true);
    expect(signals.reasons).toContain("strong_misconception_language");
  });

  it("extracts tool-derived flashcards and misconceptions and builds transcript", () => {
    const messages: UIMessage[] = [
      buildMessage({
        parts: [{ text: "I am confused about momentum", type: "text" }],
        role: "user",
      }),
      buildMessage({
        parts: [
          { text: "Momentum is conserved.", type: "text" },
          {
            output: {
              cards: [{}, {}],
              title: "Momentum set",
            },
            state: "output-available",
            type: "tool-generate_flashcards",
          } as never,
          {
            output: {
              misconception: { concept: "Momentum" },
              summary: "Stored misconception for Momentum",
            },
            state: "output-available",
            type: "tool-log_misconception",
          } as never,
        ],
        role: "assistant",
      }),
    ];

    expect(extractFlashcardsCreated(messages)).toBe(2);
    expect(extractMisconceptions(messages)).toEqual(["Momentum"]);
    expect(buildTranscript(messages)).toContain(
      "TOOL: Generated 2 mindset cards"
    );
  });

  it("resolves session windows and recent summary context", () => {
    const requestStartedAt = new Date("2026-05-17T10:00:00.000Z");
    const previousLastMessageAt = new Date("2026-05-17T09:55:00.000Z");

    const window = resolveSessionWindow({
      latestSummary: {
        endPosition: 4,
        id: "summary-1",
        startPosition: 0,
      } as never,
      latestUserPosition: 5,
      previousLastMessageAt,
      requestStartedAt,
    });

    expect(window.shouldCreateNewSummary).toBe(false);
    expect(window.summaryId).toBe("summary-1");

    expect(
      buildRecentSessionSummaryContext({
        conceptsCovered: ["Momentum"],
        flashcardsCreated: 2,
        misconceptionsDetected: ["Momentum disappears"],
        summaryText: "Reviewed conservation of momentum.",
      } as never)
    ).toContain("Recent session summary:");
  });
});
