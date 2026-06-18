import { generateText, Output } from "@avenire/ai";
import type { UIMessage } from "@avenire/ai/message-types";
import { apollo } from "@avenire/ai/models";
import {
  createSessionSummary,
  listSessionSummariesForUser,
  recomputeConceptMastery,
  type SessionSummaryRecord,
  upsertMisconception,
} from "@avenire/database";
import { logInfo } from "@avenire/observability";
import { z } from "zod";
import { normalizeSubjectLabel } from "@/lib/subject-detection";

const DEFAULT_SESSION_INACTIVITY_WINDOW_MS = 30 * 60 * 1000;
// Keep the session-summary pass cheap; this is the truncation/summarization step,
// not the primary response generation path.
const SUMMARY_MODEL = "apollo-sprint";
const MAX_SUMMARY_LIST_ITEMS = 12;
const MAX_MISCONCEPTION_CANDIDATES = 3;
const MIN_AUTOMATIC_MISCONCEPTION_CONFIDENCE = 0;
const MAX_MISCONCEPTION_CONCEPT_LENGTH = 180;
const MAX_MISCONCEPTION_REASON_LENGTH = 600;
const MAX_MISCONCEPTION_SUBJECT_LENGTH = 120;
const MAX_MISCONCEPTION_TOPIC_LENGTH = 120;
const SUMMARY_META_LINE_PATTERN =
  /^(the user\b|the assistant\b|i should\b|i need to\b|let me\b|this is (?:a|an)\b|based on\b|given the phrasing\b|\*\*key\b|key (?:requirements|findings|constraints|considerations)\b)/i;

const misconceptionCandidateSchema = z.object({
  blocks: z
    .object({
      correctedMentalModel: z.string().min(1),
      explanation: z.string().min(1),
      summary: z.string().min(1),
    })
    .optional(),
  confidence: z.number().min(0).max(1),
  concept: z.string().min(1),
  reason: z.string().min(1),
  subject: z.string().min(1),
  topic: z.string().min(1),
});

const summaryOutputSchema = z.object({
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

interface ConfusionSignals {
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

function normalizeMisconceptionCandidate(
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
  const candidateSubject = normalizeSubjectLabel(boundedSubject);

  return {
    ...(candidate.blocks
      ? {
          blocks: {
            correctedMentalModel: normalizeBoundedText(
              candidate.blocks.correctedMentalModel,
              600
            ),
            explanation: normalizeBoundedText(
              candidate.blocks.explanation,
              700
            ),
            summary: normalizeBoundedText(candidate.blocks.summary, 360),
          },
        }
      : {}),
    confidence: Math.min(1, Math.max(0, candidate.confidence)),
    concept: boundedConcept,
    reason: boundedReason,
    subject: candidateSubject ?? boundedSubject,
    topic: boundedTopic,
  };
}

function sanitizeAssistantSummaryText(value: string) {
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

function extractMessageText(
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

function extractUserTranscript(messages: UIMessage[]) {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => extractMessageText(message))
    .filter(Boolean)
    .join("\n")
    .trim();
}

const STRONG_MISCONCEPTION_SIGNAL_PATTERN =
  /\b(i (?:don't|do not) understand|i'?m confused|i am confused|i thought|i assumed|i was wrong|i keep thinking|i keep getting|wrong model|wrong idea|mistaken|misunderstood|mistake|why isn't|why doesn't|does that mean|so that means|so .*? right)\b/i;

const LEARNING_GAP_OPENING_PATTERN =
  /\b(could you explain|can you explain|explain\b.*\b(setup|concept|mechanism|process)|how does\b.*\baffect\b|what happens if|how would\b.*\bchange\b|why does\b.*\bhappen\b|what is the effect of)\b/i;

function detectConfusionSignals(transcript: string): ConfusionSignals {
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

function isCompletedToolPart(
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
      return `Generated ${cardCount} flashcards in "${normalizeText(part.output.title)}".`;
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
    // Granular file operations
    // Granular file operations
    case "tool-list_files": {
      const folderCount = Array.isArray(part.output.folders) ? part.output.folders.length : 0;
      return `Listed ${part.output.totalCount} workspace file(s)${folderCount > 0 ? ` in ${folderCount} folder(s).` : "."}`;
    }
    case "tool-read_file":
      return `Read file: ${part.output.workspacePath}.`;
    case "tool-move_file":
      return `Moved file: ${part.output.workspacePath}.`;
    case "tool-delete_file":
      return `Deleted file: ${part.output.workspacePath}.`;
    case "tool-create_folder":
      return `Created folder: ${part.output.folderPath}.`;
    case "tool-get_file_info":
      return `Got info for file: ${part.output.workspacePath}.`;
    // Granular note operations
    case "tool-create_note":
      return `Created note: ${part.output.title}.`;
    case "tool-read_note":
      return `Read note: ${part.output.title}.`;
    case "tool-update_note":
      return `Updated note: ${part.output.workspacePath}.`;
    case "tool-list_notes":
      return `Listed ${part.output.totalCount} note(s).`;
    case "tool-update_note_tags":
      return `Updated tags on note: ${part.output.fileId}.`;
    case "tool-get_due_cards":
      return `Reviewed due-card status with ${part.output.totalDueCount} cards due.`;
    default:
      return "";
  }
}

function extractFlashcardsCreated(messages: UIMessage[]) {
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

function extractMisconceptions(messages: UIMessage[]) {
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

async function persistAutomaticMisconceptions(input: {
  candidates: z.infer<typeof misconceptionCandidateSchema>[];
  endedAt: Date;
  sourceSummaryId: string;
  userId: string;
  workspaceId: string;
}) {
  for (const candidate of input.candidates) {
    logInfo({
      eventName: "misconception.candidate.created",
      payload: {
        confidence: candidate.confidence,
        concept: candidate.concept,
        subject: candidate.subject,
        topic: candidate.topic,
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    });
  }

  const seen = new Set<string>();
  const eligibleCandidates = input.candidates.filter((candidate) => {
    if (candidate.confidence < MIN_AUTOMATIC_MISCONCEPTION_CONFIDENCE) {
      logInfo({
        eventName: "misconception.candidate.rejected",
        payload: {
          confidence: candidate.confidence,
          concept: candidate.concept,
          reason: "below_confidence_threshold",
          subject: candidate.subject,
          threshold: MIN_AUTOMATIC_MISCONCEPTION_CONFIDENCE,
          topic: candidate.topic,
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
      });
      return false;
    }

    const key = [
      candidate.subject.trim().toLowerCase(),
      candidate.topic.trim().toLowerCase(),
      candidate.concept.trim().toLowerCase(),
    ].join("::");

    if (seen.has(key)) {
      logInfo({
        eventName: "misconception.candidate.rejected",
        payload: {
          confidence: candidate.confidence,
          concept: candidate.concept,
          reason: "duplicate_candidate",
          subject: candidate.subject,
          topic: candidate.topic,
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
      });
      return false;
    }

    seen.add(key);
    return true;
  });

  if (eligibleCandidates.length === 0) {
    return;
  }

  const results = await Promise.allSettled(
    eligibleCandidates.map((candidate) =>
      upsertMisconception({
        blocks: candidate.blocks,
        confidence: candidate.confidence,
        concept: candidate.concept,
        evidenceClass: "session",
        evidenceRootId: input.sourceSummaryId,
        reason: candidate.reason,
        source: "auto",
        sourceSessionId: input.sourceSummaryId,
        subject: candidate.subject,
        topic: candidate.topic,
        status: "candidate",
        userId: input.userId,
        workspaceId: input.workspaceId,
        observedAt: input.endedAt,
      })
    )
  );

  await Promise.allSettled(
    results.flatMap((result) => {
      if (
        result.status !== "fulfilled" ||
        result.value.status !== "confirmed"
      ) {
        return [];
      }

      return [
        recomputeConceptMastery({
          concept: result.value.concept,
          subject: result.value.subject,
          topic: result.value.topic,
          userId: result.value.userId,
          workspaceId: result.value.workspaceId,
        }),
      ];
    })
  );
}

function buildTranscript(messages: UIMessage[]) {
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

function isTrivialSession(messages: UIMessage[]) {
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

export async function persistSessionSummaryForCompletedTurn(input: {
  chatId: string;
  endedAt: Date;
  latestSummary: SessionSummaryRecord | null;
  latestUserPosition: number;
  messages: UIMessage[];
  forceNewSessionBoundary?: boolean;
  previousLastMessageAt: Date | null;
  requestStartedAt: Date;
  subject?: string | null;
  subjectConfidence?: number | null;
  userId: string;
  workspaceId: string;
}) {
  const window = resolveSessionWindow({
    latestSummary: input.latestSummary,
    latestUserPosition: input.latestUserPosition,
    previousLastMessageAt: input.previousLastMessageAt,
    requestStartedAt: input.requestStartedAt,
    forceNewSessionBoundary: input.forceNewSessionBoundary,
  });
  const boundedMessages = input.messages.slice(window.startPosition);

  if (boundedMessages.length === 0 || isTrivialSession(boundedMessages)) {
    return null;
  }

  const transcript = buildTranscript(boundedMessages);
  const userTranscript = extractUserTranscript(boundedMessages);
  const flashcardsCreated = extractFlashcardsCreated(boundedMessages);
  const misconceptionsDetected = extractMisconceptions(boundedMessages);
  const confusionSignals = detectConfusionSignals(userTranscript);

  if (!transcript) {
    return null;
  }

  if (confusionSignals.detected) {
    logInfo({
      eventName: "misconception.stage1.detected",
      payload: {
        reasons: confusionSignals.reasons,
        transcriptLength: userTranscript.length,
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    });
  }

  const result = await generateText({
    model: apollo.languageModel(SUMMARY_MODEL),
    output: Output.object({ schema: summaryOutputSchema }),
    prompt: [
      "Classify and summarize this completed chat session window for learning memory.",
      "Return concise, factual output only.",
      "First decide whether this window is genuinely learning-relevant or non-learning.",
      "Use non_learning for shopping, file navigation, operational requests, ambiguous utility lookups, greetings, admin chatter, or generic support help.",
      "Only use learning when the exchange is meaningfully about study, tutoring, conceptual understanding, or skill-building.",
      "If memoryRelevance is non_learning, return subject as null, subjectConfidence as null, empty conceptsCovered, empty misconceptionsDetected, empty misconceptionCandidates, and a short summary explaining why it was skipped.",
      "If memoryRelevance is learning, focus on concepts covered, misconceptions explicitly surfaced, and the learning outcome.",
      "Only identify an academic subject when memoryRelevance is learning.",
      "Only infer up to three concept-level misconception candidates when the user clearly expresses confusion, states or implies a wrong mental model, repeats the same mistaken assumption, or draws an incorrect conclusion that persists across the exchange.",
      "Stay selective. Do not infer a misconception from a normal feature check, casual curiosity, or a single minor clarification unless the exchange indicates a real conceptual gap worth tracking.",
      confusionSignals.detected
        ? `Confusion detection stage: detected. Reasons: ${confusionSignals.reasons.join(", ")}. Verify only concrete wrong models with concept grounding.`
        : "Confusion detection stage: no strong signal. Return an empty misconceptionCandidates array unless the transcript clearly contains a durable wrong model.",
      `Flashcards created during this window: ${flashcardsCreated}`,
      misconceptionsDetected.length > 0
        ? `Misconceptions already detected by tools: ${misconceptionsDetected.join(", ")}`
        : "Misconceptions already detected by tools: none",
      "For subject, use an established subject label such as Mathematics, Physics, Chemistry, Biology, Computer Science, History, Literature, or Economics.",
      "For each misconceptionCandidate, classify subject and topic from that candidate's concept, reason, and the local transcript evidence. Do not copy the session subject when the candidate is about a different field.",
      "For misconceptionCandidates, keep concept labels short and specific, ideally under 180 characters, and keep subject/topic labels concise.",
      "For misconceptionCandidates.topic, use the most specific standard topic label justified by the candidate evidence; if uncertain, use a broad topic within the candidate subject rather than an unrelated session topic.",
      "For misconceptionCandidates, return objects with concept, subject, topic, reason, confidence, and blocks.",
      "For misconceptionCandidates.confidence, estimate the learner's current confidence or stability with the concept from 0 to 1. Use lower values for shaky understanding, not your classifier certainty.",
      "For misconceptionCandidates.blocks, write summary as the misconception in one short sentence, correctedMentalModel as the replacement model the learner should use, and explanation as a short explanation that connects the correction to the original mistake.",
      "Session transcript:",
      transcript,
    ].join("\n\n"),
  });

  const detectedSubject = normalizeSubjectLabel(result.output.subject);
  const normalizedCandidates = result.output.misconceptionCandidates.map(
    (candidate) =>
      normalizeMisconceptionCandidate(candidate, {
        sessionSubject: detectedSubject,
        transcript,
      })
  );
  const shouldPersistLearningMemory =
    result.output.memoryRelevance === "learning";

  if (confusionSignals.detected) {
    logInfo({
      eventName: "misconception.stage2.verified",
      payload: {
        candidateCount: normalizedCandidates.length,
        memoryRelevance: result.output.memoryRelevance,
        relevanceReason: result.output.relevanceReason,
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    });
  }

  if (!shouldPersistLearningMemory) {
    logInfo({
      eventName: "session_summary.memory.skipped",
      payload: {
        chatId: input.chatId,
        reason: result.output.relevanceReason,
        userId: input.userId,
        workspaceId: input.workspaceId,
      },
    });
    return null;
  }

  const summary = await createSessionSummary({
    chatId: input.chatId,
    conceptsCovered: result.output.conceptsCovered,
    endedAt: input.endedAt,
    endPosition: input.messages.length - 1,
    flashcardsCreated,
    id: window.summaryId ?? undefined,
    misconceptionsDetected: Array.from(
      new Set([
        ...misconceptionsDetected,
        ...result.output.misconceptionsDetected,
      ])
    ).slice(0, MAX_SUMMARY_LIST_ITEMS),
    subject: detectedSubject,
    subjectConfidence: result.output.subjectConfidence ?? null,
    startedAt:
      window.shouldCreateNewSummary || !input.latestSummary
        ? input.requestStartedAt
        : new Date(input.latestSummary.startedAt),
    startPosition: window.startPosition,
    summaryText: result.output.summaryText,
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (summary) {
    await persistAutomaticMisconceptions({
      candidates: normalizedCandidates,
      endedAt: input.endedAt,
      sourceSummaryId: summary.id,
      userId: input.userId,
      workspaceId: input.workspaceId,
    });
  }

  return summary;
}

export async function getWorkspaceSubjectSummary(input: {
  userId: string;
  workspaceId: string;
}): Promise<SessionSummaryRecord | null> {
  const summaries = await listSessionSummariesForUser({
    userId: input.userId,
    workspaceId: input.workspaceId,
    limit: 2,
  });

  const latest = summaries[0] ?? null;
  if (!latest) {
    return null;
  }

  if ((latest.subjectConfidence ?? 0) >= 0.5) {
    return latest;
  }

  const fallback = summaries[1] ?? null;
  if (fallback?.subject) {
    return fallback;
  }

  return latest.subject ? latest : null;
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
      ? `Flashcards created: ${summary.flashcardsCreated}.`
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
