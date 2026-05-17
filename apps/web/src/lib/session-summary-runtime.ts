import "server-only";

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
import { isAiProviderConfigurationError } from "@/lib/ai-provider-errors";
import {
  buildTranscript,
  detectConfusionSignals,
  extractFlashcardsCreated,
  extractMisconceptions,
  extractUserTranscript,
  isTrivialSession,
  MAX_SUMMARY_LIST_ITEMS,
  MIN_AUTOMATIC_MISCONCEPTION_CONFIDENCE,
  type MisconceptionCandidate,
  normalizeMisconceptionCandidate,
  resolveSessionWindow,
  summaryOutputSchema,
} from "@/lib/session-summary-model";
import { normalizeSubjectLabel } from "@/lib/subject-detection";

// Keep the session-summary pass cheap; this is the truncation/summarization step,
// not the primary response generation path.
const SUMMARY_MODEL = "apollo-sprint";

async function persistAutomaticMisconceptions(input: {
  candidates: MisconceptionCandidate[];
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

  let result: Awaited<ReturnType<typeof generateText>>;
  try {
    result = await generateText({
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
        `Mindset cards created during this window: ${flashcardsCreated}`,
        misconceptionsDetected.length > 0
          ? `Misconceptions already detected by tools: ${misconceptionsDetected.join(", ")}`
          : "Misconceptions already detected by tools: none",
        "For subject, use an established subject label such as Mathematics, Physics, Chemistry, Biology, Computer Science, History, Literature, or Economics.",
        "For misconceptionCandidates, keep concept labels short and specific, ideally under 180 characters, and keep subject/topic labels concise.",
        "For misconceptionCandidates, return objects with concept, subject, topic, reason, and confidence.",
        "Session transcript:",
        transcript,
      ].join("\n\n"),
    });
  } catch (error) {
    if (isAiProviderConfigurationError(error)) {
      logInfo({
        eventName: "session_summary.memory.skipped",
        payload: {
          chatId: input.chatId,
          model: SUMMARY_MODEL,
          reason: "provider_not_configured",
          userId: input.userId,
          workspaceId: input.workspaceId,
        },
      });
      return null;
    }

    throw error;
  }

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
