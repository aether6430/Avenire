import { createHash } from "node:crypto";
import { logInfo } from "@avenire/observability";

const TOKEN_SPLIT_PATTERN = /\s+/;
const NON_TOKEN_CHAR_PATTERN = /[^a-z0-9\s]/g;

export interface RetrievalQualityCandidate {
  chunkId: string;
  content?: string | null;
  fileId?: string | null;
  score?: number | null;
  sourceType?: string | null;
}

export interface RetrievalQualitySignalInput {
  assistantText: string;
  candidates: RetrievalQualityCandidate[];
  chatId?: string | null;
  query?: string | null;
  userId?: string | null;
  workspaceId?: string | null;
}

export interface RetrievalQualitySignal {
  candidateCount: number;
  inferredUsedChunkIds: string[];
  precisionAtK: Record<string, number>;
  queryHash: string | null;
  recallAtK: Record<string, number>;
  usedChunkCount: number;
}

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(NON_TOKEN_CHAR_PATTERN, " ")
    .split(TOKEN_SPLIT_PATTERN)
    .filter((token) => token.length > 2);

const hashQuery = (query?: string | null) => {
  const normalized = query?.replace(/\s+/g, " ").trim();
  return normalized
    ? createHash("sha256").update(normalized).digest("hex")
    : null;
};

function inferChunkUsage(
  assistantText: string,
  candidates: RetrievalQualityCandidate[]
) {
  const responseTokens = new Set(tokenize(assistantText));
  if (responseTokens.size === 0) {
    return [];
  }

  return candidates
    .map((candidate, index) => {
      const contentTokens = Array.from(
        new Set(tokenize(candidate.content ?? ""))
      );
      if (contentTokens.length === 0) {
        return null;
      }

      const matched = contentTokens.filter((token) =>
        responseTokens.has(token)
      );
      const overlap = matched.length / Math.min(80, contentTokens.length);
      const exactSnippet =
        candidate.content && candidate.content.length >= 48
          ? assistantText
              .toLowerCase()
              .includes(candidate.content.slice(0, 96).toLowerCase())
          : false;

      return {
        chunkId: candidate.chunkId,
        index,
        used: exactSnippet || overlap >= 0.12 || matched.length >= 8,
      };
    })
    .filter(
      (value): value is { chunkId: string; index: number; used: boolean } =>
        Boolean(value)
    )
    .filter((value) => value.used);
}

export function computeRetrievalQualitySignal(
  input: RetrievalQualitySignalInput
): RetrievalQualitySignal {
  const dedupedCandidates = Array.from(
    new Map(
      input.candidates.map((candidate) => [candidate.chunkId, candidate])
    ).values()
  ).filter((candidate) => candidate.chunkId);
  const inferredUsage = inferChunkUsage(input.assistantText, dedupedCandidates);
  const usedChunkIds = new Set(inferredUsage.map((usage) => usage.chunkId));
  const usedChunkCount = usedChunkIds.size;
  const precisionAtK: Record<string, number> = {};
  const recallAtK: Record<string, number> = {};

  for (const k of [1, 3, 5, 10]) {
    const topK = dedupedCandidates.slice(0, k);
    const hits = topK.filter((candidate) =>
      usedChunkIds.has(candidate.chunkId)
    );
    precisionAtK[`p@${k}`] = topK.length > 0 ? hits.length / topK.length : 0;
    recallAtK[`recall@${k}`] =
      usedChunkCount > 0 ? hits.length / usedChunkCount : 0;
  }

  return {
    candidateCount: dedupedCandidates.length,
    inferredUsedChunkIds: Array.from(usedChunkIds),
    precisionAtK,
    queryHash: hashQuery(input.query),
    recallAtK,
    usedChunkCount,
  };
}

export function logRetrievalQualitySignal(input: RetrievalQualitySignalInput) {
  const signal = computeRetrievalQualitySignal(input);
  if (signal.candidateCount === 0) {
    return signal;
  }

  logInfo({
    eventName: "retrieval.quality.feedback",
    payload: {
      ...signal,
      chatId: input.chatId ?? null,
      userId: input.userId ?? null,
      workspaceId: input.workspaceId ?? null,
    },
  });

  return signal;
}
