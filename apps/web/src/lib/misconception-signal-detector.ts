import {
  detectMisconceptionSignals as detectMisconceptionSignalsCore,
  type MisconceptionSignalResult,
} from "@avenire/ai/misconception-signals";
import {
  getActiveMisconceptions,
  type MisconceptionRecord,
} from "@/lib/learning-data";
import { getCachedToolResult } from "@/lib/ai-tool-result-cache";

const MAX_ACTIVE_MISCONCEPTIONS = 32;
const ACTIVE_MISCONCEPTION_SIGNAL_CACHE_TTL_SECONDS = 60 * 5;

function mapMisconceptionForSignal(record: MisconceptionRecord) {
  return {
    confidence: record.confidence,
    concept: record.concept,
    id: record.id,
    reason: record.reason,
    subject: record.subject,
    topic: record.topic,
    updatedAt: record.updatedAt,
  };
}

function isMisconceptionRecordArray(
  value: unknown
): value is MisconceptionRecord[] {
  return (
    Array.isArray(value) &&
    value.every(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        typeof (entry as { concept?: unknown }).concept === "string" &&
        typeof (entry as { subject?: unknown }).subject === "string" &&
        typeof (entry as { topic?: unknown }).topic === "string"
    )
  );
}

export async function detectMisconceptionSignals(input: {
  abortSignal?: AbortSignal;
  latestUserText: string;
  subject: string | null;
  topic: string | null;
  userId: string;
  workspaceId: string;
}): Promise<MisconceptionSignalResult | null> {
  if (!input.latestUserText.trim() || !process.env.COHERE_API_KEY?.trim()) {
    return null;
  }

  const { value: misconceptions } = await getCachedToolResult({
    execute: () =>
      getActiveMisconceptions({
        limit: MAX_ACTIVE_MISCONCEPTIONS,
        subject: input.subject ?? undefined,
        userId: input.userId,
        workspaceId: input.workspaceId,
      }),
    input: {
      limit: MAX_ACTIVE_MISCONCEPTIONS,
      subject: input.subject,
    },
    scope: {
      userId: input.userId,
      workspaceId: input.workspaceId,
    },
    toolName: "misconception_signal_active_misconceptions",
    ttlSeconds: ACTIVE_MISCONCEPTION_SIGNAL_CACHE_TTL_SECONDS,
    validate: isMisconceptionRecordArray,
  });
  if (misconceptions.length === 0) {
    return null;
  }

  return detectMisconceptionSignalsCore({
    abortSignal: input.abortSignal,
    latestUserText: input.latestUserText,
    misconceptions: misconceptions.map(mapMisconceptionForSignal),
    subject: input.subject,
    topic: input.topic,
  });
}
