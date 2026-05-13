import {
  detectMisconceptionSignals as detectMisconceptionSignalsCore,
  type MisconceptionSignalResult,
} from "@avenire/ai/misconception-signals";
import {
  getActiveMisconceptions,
  type MisconceptionRecord,
} from "@/lib/learning-data";

const MAX_ACTIVE_MISCONCEPTIONS = 32;

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

  const misconceptions = await getActiveMisconceptions({
    limit: MAX_ACTIVE_MISCONCEPTIONS,
    subject: input.subject ?? undefined,
    userId: input.userId,
    workspaceId: input.workspaceId,
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
