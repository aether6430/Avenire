import type { UIMessage } from "@avenire/ai/message-types";
import {
  canonicalizeLearningTaxonomy,
  type SessionSummaryRecord,
} from "@avenire/database";
import { z } from "zod";
import {
  inferTopicLabel,
  normalizeSubjectLabel,
} from "@/lib/subject-detection";

export const MAX_SUMMARY_LIST_ITEMS = 12;
const MAX_MISCONCEPTION_CANDIDATES = 3;
export const MIN_AUTOMATIC_MISCONCEPTION_CONFIDENCE = 0.45;
const MAX_MISCONCEPTION_CONCEPT_LENGTH = 180;
const MAX_MISCONCEPTION_REASON_LENGTH = 600;
const MAX_MISCONCEPTION_SUBJECT_LENGTH = 120;
const MAX_MISCONCEPTION_TOPIC_LENGTH = 120;
const SUMMARY_META_LINE_PATTERN =
  /^(the user\b|the assistant\b|i should\b|i need to\b|let me\b|this is (?:a|an)\b|based on\b|given the phrasing\b|\*\*key\b|key (?:requirements|findings|constraints|considerations)\b)/i;
const STRONG_MISCONCEPTION_SIGNAL_PATTERN =
  /\b(i (?:don't|do not) understand|i'?m confused|i am confused|i thought|i assumed|i was wrong|i keep thinking|i keep getting|wrong model|wrong idea|mistaken|misunderstood|mistake|why isn't|why doesn't|does that mean|so that means|so .*? right)\b/i;
const LEARNING_GAP_OPENING_PATTERN =
  /\b(could you explain|can you explain|explain\b.*\b(setup|concept|mechanism|process)|how does\b.*\baffect\b|what happens if|how would\b.*\bchange\b|why does\b.*\bhappen\b|what is the effect of)\b/i;
export const DEFAULT_SESSION_INACTIVITY_WINDOW_MS = 30 * 60 * 1000;

export const misconceptionCandidateSchema = z.object({
  confidence: z.number().min(0).max(1),
  concept: z.string().min(1),
  reason: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
});
export type MisconceptionCandidate = z.infer<
  typeof misconceptionCandidateSchema
>;

export const summaryOutputSchema = z.object({
  conceptsCovered: z.array(z.string().min(1)).max(MAX_SUMMARY_LIST_ITEMS),
  memoryRelevance: z.enum(["learning", "non_learning"]),
  misconceptionsDetected: z
    .array(z.string().min(1))
    .max(MAX_SUMMARY_LIST_ITEMS),
  misconceptionCandidates: z
    .array(misconceptionCandidateSchema)
    .max(MAX_MISCONCEPTION_CANDIDATES),
  relevanceReason: z.string().min(1),
  subject: z.string().min(1).nullable(),
  subjectConfidence: z.number().min(0).max(1).nullable(),
  summaryText: z.string().min(1),
});

type ToolPart = Extract<UIMessage["parts"][number], { type: `tool-${string}` }>;

export interface ConfusionSignals {
  detected: boolean;
  reasons: string[];
}

export interface SessionWindow {
  shouldCreateNewSummary: boolean;
  startPosition: number;
  summaryId: string | null;
}

function normalizeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoundedText(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Expected non-empty text.");
  }

  return trimmed.slice(0, maxLength);
}

export function normalizeMisconceptionCandidate(
  candidate: z.infer<typeof misconceptionCandidateSchema>,
  context?: {
    sessionSubject?: string | null;
    transcript?: string;
  }
) {
  const boundedConcept = normalizeBoundedText(
    candidate.concept,
    MAX_MISCONCEPTION_CONCEPT_LENGTH
  );
  const boundedReason = normalizeBoundedText(
    candidate.reason,
    MAX_MISCONCEPTION_REASON_LENGTH
  );
  const boundedSubject = normalizeBoundedText(
    candidate.subject,
    MAX_MISCONCEPTION_SUBJECT_LENGTH
  );
  const boundedTopic = normalizeBoundedText(
    candidate.topic,
    MAX_MISCONCEPTION_TOPIC_LENGTH
  );
  const sessionSubject = normalizeSubjectLabel(context?.sessionSubject ?? null);
  const inferredTopic = sessionSubject
    ? inferTopicLabel(
        [boundedConcept, boundedReason, context?.transcript ?? ""].join("\n"),
        sessionSubject
      )
    : null;
  const canonical = canonicalizeLearningTaxonomy({
    concept: boundedConcept,
    subject: sessionSubject ?? boundedSubject,
    text: [boundedConcept, boundedReason, context?.transcript ?? ""].join("\n"),
    topic: inferredTopic ?? boundedTopic,
  });

  return {
    confidence: Math.min(1, Math.max(0, candidate.confidence)),
    concept: canonical?.concept ?? boundedConcept,
    reason: boundedReason,
    subject: canonical?.subject ?? sessionSubject ?? boundedSubject,
    topic: canonical?.topic ?? inferredTopic ?? boundedTopic,
  };
}

export function sanitizeAssistantSummaryText(value: string) {
  const lines = value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return "";
  }

  let firstContentIndex = 0;
  while (
    firstContentIndex < lines.length &&
    SUMMARY_META_LINE_PATTERN.test(lines[firstContentIndex] ?? "")
  ) {
    firstContentIndex += 1;
  }

  return lines
    .slice(firstContentIndex)
    .filter((line) => !SUMMARY_META_LINE_PATTERN.test(line))
    .join("\n")
    .trim();
}

export function extractMessageText(
  message: UIMessage,
  options?: { forSummary?: boolean }
) {
  return message.parts
    .filter(
      (part): part is Extract<typeof part, { type: "text" }> =>
        part.type === "text"
    )
    .map((part) =>
      options?.forSummary && message.role === "assistant"
        ? sanitizeAssistantSummaryText(part.text)
        : part.text.trim()
    )
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function extractUserTranscript(messages: UIMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => extractMessageText(message))
    .filter(Boolean)
    .join("\n")
    .trim();
}

export function detectConfusionSignals(transcript: string): ConfusionSignals {
  const reasons: string[] = [];

  if (STRONG_MISCONCEPTION_SIGNAL_PATTERN.test(transcript)) {
    reasons.push("strong_misconception_language");
  }

  if (LEARNING_GAP_OPENING_PATTERN.test(transcript)) {
    reasons.push("learning_gap_opening");
  }

  return {
    detected: reasons.length > 0,
    reasons,
  };
}

export function isCompletedToolPart(
  part: UIMessage["parts"][number]
): part is Extract<ToolPart, { state: "output-available" }> {
  return (
    part.type.startsWith("tool-") &&
    "state" in part &&
    part.state === "output-available"
  );
}

function summarizeToolPart(
  part: Extract<ToolPart, { state: "output-available" }>
) {
  switch (part.type) {
    case "tool-generate_flashcards": {
      const cardCount = Array.isArray(part.output.cards)
        ? part.output.cards.length
        : 0;
      return `Generated ${cardCount} mindset cards in "${normalizeText(part.output.title)}".`;
    }
    case "tool-quiz_me": {
      const questionCount =
        typeof part.output.questionCount === "number"
          ? part.output.questionCount
          : 0;
      return `Created a ${questionCount}-question quiz in "${normalizeText(part.output.title)}".`;
    }
    case "tool-log_misconception":
      return normalizeText(part.output.summary);
    case "tool-web_search":
      return `Searched the web for "${normalizeText(part.output.query)}" and found ${part.output.totalResults} results.`;
    case "tool-search_materials":
      return `Searched study materials for "${normalizeText(part.output.query)}" and found ${part.output.totalMatches} matches.`;
    case "tool-avenire_agent":
    case "tool-file_manager_agent":
    case "tool-note_agent":
      return normalizeText(part.output.summary);
    case "tool-get_due_cards":
      return `Reviewed due-card status with ${part.output.totalDueCount} cards due.`;
    default:
      return "";
  }
}

export function extractFlashcardsCreated(messages: UIMessage[]) {
  let total = 0;
  for (const message of messages) {
    for (const part of message.parts) {
      if (
        part.type === "tool-generate_flashcards" &&
        part.state === "output-available" &&
        Array.isArray(part.output.cards)
      ) {
        total += part.output.cards.length;
      }
    }
  }
  return total;
}

export function extractMisconceptions(messages: UIMessage[]) {
  return Array.from(
    new Set(
      messages.flatMap((message) =>
        message.parts.flatMap((part) => {
          if (
            part.type !== "tool-log_misconception" ||
            part.state !== "output-available"
          ) {
            return [];
          }

          const concept = normalizeText(part.output.misconception?.concept);
          return concept ? [concept] : [];
        })
      )
    )
  ).slice(0, MAX_SUMMARY_LIST_ITEMS);
}

export function buildTranscript(messages: UIMessage[]) {
  return messages
    .map((message, index) => {
      const role = message.role.toUpperCase();
      const text = extractMessageText(message, { forSummary: true });
      const toolLines = message.parts
        .filter(isCompletedToolPart)
        .map(summarizeToolPart)
        .filter(Boolean)
        .map((line) => `TOOL: ${line}`);
      const content = [text, ...toolLines].filter(Boolean).join("\n");
      return content ? `Message ${index + 1} [${role}]\n${content}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function isTrivialSession(messages: UIMessage[]) {
  const userTexts = messages
    .filter((message) => message.role === "user")
    .map((message) => extractMessageText(message))
    .filter(Boolean);
  const assistantTexts = messages
    .filter((message) => message.role === "assistant")
    .map((message) => extractMessageText(message, { forSummary: true }))
    .filter(Boolean);
  const toolCount = messages.flatMap((message) =>
    message.parts.filter(isCompletedToolPart)
  ).length;

  return (
    userTexts.length === 0 ||
    (assistantTexts.length === 0 && toolCount === 0) ||
    (userTexts.join(" ").length < 24 &&
      assistantTexts.join(" ").length < 48 &&
      toolCount === 0)
  );
}

export function resolveSessionWindow(input: {
  latestSummary: SessionSummaryRecord | null;
  latestUserPosition: number;
  previousLastMessageAt: Date | null;
  requestStartedAt: Date;
  forceNewSessionBoundary?: boolean;
}) {
  if (input.forceNewSessionBoundary) {
    return {
      shouldCreateNewSummary: true,
      startPosition: input.latestSummary
        ? Math.max(0, input.latestSummary.endPosition + 1)
        : 0,
      summaryId: null,
    } satisfies SessionWindow;
  }

  const inactivityWindowMs = DEFAULT_SESSION_INACTIVITY_WINDOW_MS;
  const inactiveForMs = input.previousLastMessageAt
    ? input.requestStartedAt.getTime() - input.previousLastMessageAt.getTime()
    : Number.POSITIVE_INFINITY;
  const isNewSessionBoundary =
    !input.latestSummary || inactiveForMs >= inactivityWindowMs;

  if (isNewSessionBoundary) {
    return {
      shouldCreateNewSummary: true,
      startPosition: Math.max(0, input.latestUserPosition),
      summaryId: null,
    } satisfies SessionWindow;
  }

  const latest = input.latestSummary;
  if (!latest) {
    throw new Error(
      "Expected latestSummary to exist after session boundary check"
    );
  }
  return {
    shouldCreateNewSummary: false,
    startPosition: Math.max(0, latest.startPosition),
    summaryId: latest.id,
  } satisfies SessionWindow;
}

export function buildRecentSessionSummaryContext(
  summary: SessionSummaryRecord | null
) {
  if (!summary) {
    return null;
  }

  const concepts =
    summary.conceptsCovered.length > 0
      ? `Concepts covered: ${summary.conceptsCovered.join(", ")}.`
      : null;
  const misconceptions =
    summary.misconceptionsDetected.length > 0
      ? `Recent misconceptions: ${summary.misconceptionsDetected.join(", ")}.`
      : null;
  const flashcards =
    summary.flashcardsCreated > 0
      ? `Mindset cards created: ${summary.flashcardsCreated}.`
      : null;

  return [
    "Recent session summary:",
    summary.summaryText,
    concepts,
    misconceptions,
    flashcards,
    "Use this as soft continuity context only.",
  ]
    .filter(Boolean)
    .join(" ");
}
