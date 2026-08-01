import { apollo } from "@avenire/ai";
import { logInfo, logWarn, safeError } from "@avenire/observability";
import { rerank } from "ai";
import { config } from "../config";
import {
  embedMultimodal,
  rerankByCohereWithQueryEmbedding,
  textToMultimodalInput,
} from "../ingestion/embeddings";
import { getLearnerSignalBoosts } from "./learner-signals";
import { expandQuery, generateHydeDocument } from "./query-expansion";
import {
  observeRetrievalProviderCall,
  recordRetrievalQualityTelemetry,
} from "./telemetry";
import type { VectorSearchResult, VectorStore } from "./vector-store";

const RETRIEVAL_CONTEXT_TOKEN_BUDGET = 2400;
const FAST_PATH_CONTEXT_TOKEN_BUDGET = 1200;
const FAST_PATH_CONFIDENCE_THRESHOLD = 0.82;
const DEFAULT_CALIBRATION_SHADOW_SAMPLE_RATE = 0.15;
const BASE_RESOURCE_DIVERSITY = 3;
const MAX_RESOURCE_DIVERSITY = 8;
const DENSE_PRESERVATION_RATIO = 0.4;

const VISUAL_INTENT_PATTERN =
  /\b(video|image|frame|scene|look|see|show|visual|picture|skyline|diagram|screen)\b/i;
const AUDIO_INTENT_PATTERN =
  /\b(audio|sound|voice|spoken|speech|podcast|music|transcript|listen|hear)\b/i;
const DOCUMENT_INTENT_PATTERN =
  /(?:\b(?:pdf|document|paper|chapter|page|citation|quote|paragraph|text|spreadsheet|libreoffice|opendocument|word document|word file|microsoft word document|microsoft word file|powerpoint deck|powerpoint presentation|powerpoint file|excel sheet|excel workbook|excel file)\b|\.(?:docx?|pptx?|xlsx?|od[tpmsgfb]|ot[tpmsg])\b)/i;
const SYNTHESIS_INTENT_PATTERN =
  /\b(compare|contrast|relate|combine|across|both|shared|analog(?:y|ous)|synthesi[sz]e|together)\b/i;
const TOKEN_SPLIT_PATTERN = /\s+/;
const NOISY_TEXT_PATTERN =
  /(x264|mpeg-4|h\.264|cabac|deblock|bframes|keyint|qcomp|rc_lookahead|threads=)/i;
const FRAGMENT_START_PATTERN = /^[a-z0-9,;:)\]-]/;
const FRAGMENT_END_PATTERN = /[.!?]["')\]]?$/;
const NON_TOKEN_CHAR_PATTERN = /[^a-z0-9\s]/g;
const QUOTED_PHRASE_PATTERN = /"([^"\n]{3,})"/;
const SYMBOL_HEAVY_PATTERN = /[^\w\s]/;
const CODE_IDENTIFIER_PATTERN =
  /\b(?:[A-Z0-9]+_[A-Z0-9_]+|[a-z]+[A-Z][A-Za-z0-9]*)\b/;

type FusionCandidate = VectorSearchResult & {
  fusionScore: number;
};

type RankedCandidate = VectorSearchResult & {
  fusionScore?: number;
  rerankScore: number;
};

type RetrievedCandidate = VectorSearchResult & {
  content: string;
  fusionScore?: number;
  rerankScore: number;
};

export type RetrievalTraceStage =
  | "dense"
  | "lexical"
  | "trigram"
  | "modality-dense"
  | "query-fusion"
  | "global-fusion"
  | "scored-pre-rerank"
  | "rerank-input"
  | "rerank-output"
  | "final";

export interface RetrievalTraceCandidate {
  chunkId: string;
  endMs: number | null;
  fileId: string | null;
  fusionScore: number | null;
  rerankScore: number | null;
  resourceId: string;
  score: number;
  sourceType: VectorSearchResult["sourceType"];
  startMs: number | null;
}

export interface RetrievalTraceSnapshot {
  candidates: RetrievalTraceCandidate[];
  path: "fast" | "full";
  query: string;
  queryKind: "original" | "expanded" | "decomposed" | "hyde";
  stage: RetrievalTraceStage;
}

export type RetrievalTraceCollector = (
  snapshot: RetrievalTraceSnapshot
) => void;

interface TimedQueryEnhancement {
  latencyMs: number;
  value: string | null;
}

interface QueryEnhancementTasks {
  expansion: Promise<TimedQueryEnhancement>;
  hyde: Promise<TimedQueryEnhancement>;
  wasHydeFallbackUsed: () => boolean;
}

export const createStaticQueryEnhancementTasks = (input: {
  expandedQuery: string | null;
  hydeDocument: string | null;
}): QueryEnhancementTasks => ({
  expansion: Promise.resolve({ latencyMs: 0, value: input.expandedQuery }),
  hyde: Promise.resolve({ latencyMs: 0, value: input.hydeDocument }),
  wasHydeFallbackUsed: () => false,
});

const emitRetrievalTrace = (
  trace: RetrievalTraceCollector | undefined,
  input: Omit<RetrievalTraceSnapshot, "candidates"> & {
    candidates: Array<
      VectorSearchResult & { fusionScore?: number; rerankScore?: number }
    >;
  }
) => {
  trace?.({
    ...input,
    candidates: input.candidates.map((candidate) => ({
      chunkId: candidate.chunkId,
      fileId: candidate.fileId,
      fusionScore: candidate.fusionScore ?? null,
      rerankScore: candidate.rerankScore ?? null,
      resourceId: candidate.resourceId,
      score: candidate.score,
      sourceType: candidate.sourceType,
      startMs: candidate.startMs,
      endMs: candidate.endMs,
    })),
  });
};

interface RetrievalPathResult {
  ambiguityReasons: string[];
  calibration?: {
    citationAgreement: number;
    fastCandidateCount: number;
    fastLatencyMs: number;
    thresholdDecisions: Array<{ threshold: number; wouldTakeFast: boolean }>;
    topKOverlap: number;
    slowCandidateCount: number;
    slowLatencyMs: number;
  };
  confidence: number;
  context: string;
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>> | null;
  decision: RetrievalDecisionTelemetry;
  latencyMs: number;
  path: "fast" | "slow";
  results: Array<{
    resourceId: string;
    fileId: string | null;
    sourceType:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    source: string;
    provider: string | null;
    title: string | null;
    chunkId: string;
    chunkIndex: number;
    page: number | null;
    startMs: number | null;
    endMs: number | null;
    content: string;
    score: number;
    rerankScore: number;
    metadata: Record<string, unknown>;
  }>;
}

export interface RetrievalDecisionTelemetry {
  ambiguityReasons: string[];
  candidateCount: number;
  confidenceScore: number;
  contextTokenBudget: number;
  contextTokenCount: number;
  contextTruncated: boolean;
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>>;
  expansionUsed: boolean;
  fusionCandidateCount: number;
  hydeCandidateCount: number;
  hydeFallbackUsed: boolean;
  hydeUsed: boolean;
  intent: {
    audio: boolean;
    document: boolean;
    visual: boolean;
  };
  latencyMs: number;
  learnerBoostedCandidateCount: number;
  lexicalCandidateCount: number;
  queryCount: number;
  queryShape: {
    charCount: number;
    hasCodeIdentifier: boolean;
    hasQuestionMark: boolean;
    hasQuotedPhrase: boolean;
    provider: string | null;
    searchQueryCount: number;
    decomposedQueryCount: number;
    sourceType:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link"
      | null;
    tokenCount: number;
  };
  rerankCandidateCount: number;
  rerankFallbackUsed: boolean;
  rerankUsed: boolean;
  resultCount: number;
  resultSourceTypeMix: Record<string, number>;
  sourceTypeBreakdown: Record<string, number>;
  topRerankScore: number;
  topResultSourceType:
    | "pdf"
    | "image"
    | "video"
    | "audio"
    | "document"
    | "markdown"
    | "link"
    | null;
  userId: string | null;
  workspaceId: string | null;
}

export const normalizeRetrievalQuery = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const countQueryTokens = (value: string): number =>
  normalizeRetrievalQuery(value).split(TOKEN_SPLIT_PATTERN).filter(Boolean)
    .length;

const estimateTokens = (value: string): number =>
  Math.max(1, Math.ceil(value.length / 4));

const truncateToTokenBudget = (value: string, tokenBudget: number): string => {
  const maxChars = Math.max(1, tokenBudget * 4);
  if (value.length <= maxChars) {
    return value;
  }

  const slice = value.slice(0, maxChars);
  const lastBreak = Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(" "));
  const safeSlice =
    lastBreak > Math.floor(maxChars * 0.7) ? slice.slice(0, lastBreak) : slice;

  return `${safeSlice.trimEnd()}\n[truncated]`;
};

export const dedupeQueries = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = normalizeRetrievalQuery(value);
    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(normalized);
  }

  return out;
};

function startQueryEnhancementTasks(
  normalizedQuery: string,
  abortSignal?: AbortSignal
): QueryEnhancementTasks {
  let hydeFallbackUsed = false;
  const expansionStartedAt = performance.now();
  const expansionProviderCall = config.retrievalQueryExpansionEnabled
    ? observeRetrievalProviderCall({
        operation: "query_expansion",
        provider: "apollo",
        run: () => expandQuery(normalizedQuery, { abortSignal }),
      })
    : Promise.resolve(null);
  const expansion = expansionProviderCall
    .catch((error) => {
      if (!abortSignal?.aborted) {
        logWarn({
          eventName: "retrieval.query_expansion_fallback",
          payload: {
            error: safeError(error),
            query: normalizedQuery,
          },
        });
      }
      return null;
    })
    .then((value) => ({
      latencyMs: Math.round(performance.now() - expansionStartedAt),
      value,
    }));
  const hydeStartedAt = performance.now();
  const hydeProviderCall = config.retrievalHydeEnabled
    ? observeRetrievalProviderCall({
        operation: "hyde",
        provider: "apollo",
        run: () => generateHydeDocument(normalizedQuery, { abortSignal }),
      })
    : Promise.resolve(null);
  const hyde = hydeProviderCall
    .catch((error) => {
      if (!abortSignal?.aborted) {
        hydeFallbackUsed = true;
        logWarn({
          eventName: "retrieval.hyde_fallback",
          payload: {
            error: safeError(error),
            query: normalizedQuery,
          },
        });
      }
      return null;
    })
    .then((value) => ({
      latencyMs: Math.round(performance.now() - hydeStartedAt),
      value,
    }));

  return {
    expansion,
    hyde,
    wasHydeFallbackUsed: () => hydeFallbackUsed,
  };
}

export const decomposeQuery = (query: string): string[] => {
  const normalized = normalizeRetrievalQuery(query);
  if (!normalized) {
    return [];
  }

  const clauses = normalized
    .split(/\s+(?:and|or|then|vs\.?|versus|compare|contrast|with)\s+|[;,\n]/i)
    .map((part) => normalizeRetrievalQuery(part))
    .filter(
      (part) =>
        (countQueryTokens(part) >= 2 && part.length >= 8) ||
        CODE_IDENTIFIER_PATTERN.test(part) ||
        SYMBOL_HEAVY_PATTERN.test(part)
    );

  const quoted = Array.from(normalized.matchAll(/"([^"\n]{3,})"/g))
    .map((match) => normalizeRetrievalQuery(match[1] ?? ""))
    .filter(Boolean);

  return dedupeQueries([...quoted, ...clauses]).slice(0, 4);
};

export const diversifyByResource = <T extends { resourceId: string }>(
  rows: T[],
  maxPerResource: number
): T[] => {
  const counts = new Map<string, number>();
  const output: T[] = [];
  for (const row of rows) {
    const used = counts.get(row.resourceId) ?? 0;
    if (used >= maxPerResource) {
      continue;
    }
    counts.set(row.resourceId, used + 1);
    output.push(row);
  }
  return output;
};

export const adaptiveResourceDiversity = (input: {
  candidateCount: number;
  decomposedQueryCount: number;
}): number =>
  Math.min(
    MAX_RESOURCE_DIVERSITY,
    BASE_RESOURCE_DIVERSITY +
      Math.min(2, input.decomposedQueryCount) +
      (input.candidateCount >= 100 ? 2 : input.candidateCount >= 40 ? 1 : 0)
  );

export const preserveCandidateFloor = <T extends { chunkId: string }>(input: {
  fused: readonly T[];
  preserved: readonly T[];
  total: number;
  preservationRatio?: number;
}): T[] => {
  const preservationCount = Math.min(
    input.total,
    Math.ceil(
      input.total * (input.preservationRatio ?? DENSE_PRESERVATION_RATIO)
    )
  );
  const seen = new Set<string>();
  const output: T[] = [];
  for (const candidate of [
    ...input.preserved.slice(0, preservationCount),
    ...input.fused,
  ]) {
    if (seen.has(candidate.chunkId) || output.length >= input.total) {
      continue;
    }
    seen.add(candidate.chunkId);
    output.push(candidate);
  }
  return output;
};

export const interleaveByResource = <T extends { resourceId: string }>(
  rows: readonly T[]
): T[] => {
  const queues = new Map<string, T[]>();
  for (const row of rows) {
    const queue = queues.get(row.resourceId) ?? [];
    queue.push(row);
    queues.set(row.resourceId, queue);
  }
  const output: T[] = [];
  let added = true;
  while (added) {
    added = false;
    for (const queue of queues.values()) {
      const row = queue.shift();
      if (row) {
        output.push(row);
        added = true;
      }
    }
  }
  return output;
};

export const fuseCandidatesByRrf = (
  candidateLists: VectorSearchResult[][]
): Array<VectorSearchResult & { fusionScore: number }> => {
  const merged = new Map<
    string,
    {
      candidate: VectorSearchResult;
      fusionScore: number;
    }
  >();

  for (const candidates of candidateLists) {
    const seenInList = new Set<string>();

    candidates.forEach((candidate, index) => {
      if (seenInList.has(candidate.chunkId)) {
        return;
      }

      seenInList.add(candidate.chunkId);
      const contribution = 1 / (60 + index + 1);
      const existing = merged.get(candidate.chunkId);
      if (existing) {
        existing.fusionScore += contribution;
        if (candidate.score > existing.candidate.score) {
          existing.candidate = candidate;
        }
        return;
      }

      merged.set(candidate.chunkId, {
        candidate,
        fusionScore: contribution,
      });
    });
  }

  return Array.from(merged.values()).map(({ candidate, fusionScore }) => ({
    ...candidate,
    fusionScore,
  }));
};

const hasVisualIntent = (query: string): boolean =>
  VISUAL_INTENT_PATTERN.test(query);

const hasAudioIntent = (query: string): boolean =>
  AUDIO_INTENT_PATTERN.test(query);

const hasDocumentIntent = (query: string): boolean =>
  DOCUMENT_INTENT_PATTERN.test(query);

export const getPreferredSourceTypes = (intent: {
  visual: boolean;
  audio: boolean;
  document: boolean;
}): Set<
  "pdf" | "image" | "video" | "audio" | "document" | "markdown" | "link"
> | null => {
  const { visual, audio, document } = intent;

  if (visual && !audio && !document) {
    return new Set(["video", "image"]);
  }

  if (audio && !visual && !document) {
    return new Set(["audio", "video"]);
  }

  if (document && !visual && !audio) {
    return new Set(["pdf", "document", "markdown", "link"]);
  }

  return null;
};

const tokenize = (value: string): string[] =>
  value
    .toLowerCase()
    .replace(NON_TOKEN_CHAR_PATTERN, " ")
    .split(TOKEN_SPLIT_PATTERN)
    .filter((token) => token.length > 2);

export const lexicalOverlapScore = (query: string, content: string): number => {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return 0;
  }

  const contentTokenSet = new Set(tokenize(content));
  const matched = queryTokens.filter((token) =>
    contentTokenSet.has(token)
  ).length;
  return matched / queryTokens.length;
};

export const extractQueryTimestampMs = (query: string): number | null => {
  const match = query.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
  if (!match) {
    return null;
  }
  const first = Number(match[1]);
  const second = Number(match[2]);
  const third = match[3] === undefined ? null : Number(match[3]);
  return third === null
    ? (first * 60 + second) * 1000
    : (first * 3600 + second * 60 + third) * 1000;
};

export const temporalProximityMultiplier = (
  query: string,
  candidate: Pick<VectorSearchResult, "startMs" | "endMs">
): number => {
  const targetMs = extractQueryTimestampMs(query);
  if (targetMs === null || candidate.startMs === null) {
    return 1;
  }
  const endMs = candidate.endMs ?? candidate.startMs;
  if (candidate.startMs <= targetMs && endMs >= targetMs) {
    return 3;
  }
  const distanceMs = Math.min(
    Math.abs(targetMs - candidate.startMs),
    Math.abs(targetMs - endMs)
  );
  if (distanceMs <= 15_000) {
    return 2.2;
  }
  if (distanceMs <= 45_000) {
    return 1.35;
  }
  return 0.65;
};

export const shouldAbstainFromRetrieval = (input: {
  audioIntent: boolean;
  decomposedQueryCount: number;
  sourceType?: string;
  synthesisIntent: boolean;
  topRerankScore: number | null;
  visualIntent: boolean;
}): boolean =>
  input.topRerankScore !== null &&
  input.topRerankScore < config.retrievalAbstentionScore &&
  input.decomposedQueryCount < 2 &&
  !input.audioIntent &&
  !input.synthesisIntent &&
  !input.visualIntent &&
  input.sourceType === undefined;

export const exactPhraseScore = (query: string, content: string): number => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 5) {
    return 0;
  }

  return content.toLowerCase().includes(normalizedQuery) ? 1 : 0;
};

export const extractTrigramQuery = (query: string): string | null => {
  const normalized = normalizeRetrievalQuery(query);
  if (normalized.length < 3) {
    return null;
  }

  const quoted = normalized.match(QUOTED_PHRASE_PATTERN)?.[1]?.trim();
  if (quoted && quoted.length >= 3) {
    return quoted;
  }

  if (
    SYMBOL_HEAVY_PATTERN.test(normalized) ||
    CODE_IDENTIFIER_PATTERN.test(normalized)
  ) {
    return normalized;
  }

  return null;
};

export const isLikelyNoisyText = (content: string): boolean => {
  const normalized = normalizeRetrievalQuery(content);
  if (!normalized) {
    return true;
  }

  if (NOISY_TEXT_PATTERN.test(normalized)) {
    return true;
  }

  const printable = normalized.replace(/[^\x20-\x7E]/g, "");
  return printable.length / normalized.length < 0.8;
};

export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

export const formatChunkLocation = (
  candidate: VectorSearchResult
): string[] => {
  const parts: string[] = [];

  if (candidate.page != null) {
    parts.push(`p.${candidate.page}`);
  }

  if (candidate.startMs != null || candidate.endMs != null) {
    const start =
      candidate.startMs != null ? formatDuration(candidate.startMs) : null;
    const end =
      candidate.endMs != null ? formatDuration(candidate.endMs) : null;

    if (start && end) {
      parts.push(`${start}-${end}`);
    } else if (start) {
      parts.push(start);
    } else if (end) {
      parts.push(end);
    }
  }

  return parts;
};

export const formatChunkHeader = (candidate: VectorSearchResult): string => {
  const title =
    normalizeRetrievalQuery(candidate.title ?? "") ||
    normalizeRetrievalQuery(candidate.source) ||
    "Retrieved chunk";
  const location = formatChunkLocation(candidate);

  return location.length > 0
    ? `[${title}, ${location.join(", ")}]`
    : `[${title}]`;
};

export const isFragmentaryChunk = (content: string): boolean => {
  const normalized = normalizeRetrievalQuery(content);
  if (normalized.length < 120) {
    return false;
  }

  const startsMidSentence = FRAGMENT_START_PATTERN.test(normalized);
  const endsMidSentence = !FRAGMENT_END_PATTERN.test(normalized);

  return startsMidSentence || endsMidSentence;
};

export const buildChunkContext = (chunks: VectorSearchResult[]): string =>
  chunks
    .map(
      (chunk) =>
        `${formatChunkHeader(chunk)}\n${normalizeRetrievalQuery(chunk.content)}`
    )
    .join("\n\n")
    .trim();

const expandWithAdjacentChunks = (
  candidate: VectorSearchResult,
  adjacentByChunkId: Map<string, VectorSearchResult[]>
): VectorSearchResult[] => {
  if (!isFragmentaryChunk(candidate.content)) {
    return [candidate];
  }

  const adjacent = adjacentByChunkId.get(candidate.chunkId);
  if (!(adjacent && adjacent.length > 0)) {
    return [candidate];
  }

  return [...adjacent, candidate].sort(
    (left, right) => left.chunkIndex - right.chunkIndex
  );
};

export const buildContextAwareResults = (
  reranked: RetrievedCandidate[],
  adjacentByChunkId: Map<string, VectorSearchResult[]>,
  tokenBudget: number
): {
  context: string;
  results: RetrievedCandidate[];
  tokenCount: number;
  truncated: boolean;
} => {
  const results: RetrievedCandidate[] = [];
  let tokenCount = 0;
  let truncated = false;

  for (const candidate of reranked) {
    const expandedChunks = expandWithAdjacentChunks(
      candidate,
      adjacentByChunkId
    );
    const content = buildChunkContext(expandedChunks);
    const contentTokens = estimateTokens(content);

    if (results.length > 0 && tokenCount + contentTokens > tokenBudget) {
      truncated = true;
      continue;
    }

    if (results.length === 0 && contentTokens > tokenBudget) {
      const trimmedContent = truncateToTokenBudget(content, tokenBudget);
      results.push({
        ...candidate,
        content: trimmedContent,
      });
      tokenCount = estimateTokens(trimmedContent);
      truncated = true;
      break;
    }

    results.push({
      ...candidate,
      content,
    });
    tokenCount += contentTokens;
  }

  const context = results
    .map((result) => result.content)
    .join("\n\n")
    .trim();

  return {
    context,
    results,
    tokenCount,
    truncated,
  };
};

function buildRetrievalDecisionTelemetry(input: {
  audioIntent: boolean;
  assembled: {
    results: RetrievedCandidate[];
    tokenCount: number;
    truncated: boolean;
  };
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>>;
  documentIntent: boolean;
  expandedQuery: string | null;
  latencyMs: number;
  learnerSignalBoosts: Map<string, { boost: number }>;
  mergedCandidates: FusionCandidate[];
  normalizedQuery: string;
  options?: {
    provider?: string;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    userId?: string;
    workspaceId?: string;
  };
  querySearchResults: VectorSearchResult[][];
  lexicalCandidateCount: number;
  queryCount: number;
  decomposedQueryCount: number;
  hydeCandidateCount: number;
  hydeDocument: string | null;
  hydeFallbackUsed: boolean;
  rerankCandidates: FusionCandidate[];
  rerankFallbackUsed: boolean;
  reranked: RetrievedCandidate[];
  sortedCandidates: FusionCandidate[];
  visualIntent: boolean;
}): RetrievalDecisionTelemetry {
  const queryTokenCount = countQueryTokens(input.normalizedQuery);
  const expansionUsed =
    typeof input.expandedQuery === "string" &&
    normalizeRetrievalQuery(input.expandedQuery) !== input.normalizedQuery;
  const hydeUsed =
    typeof input.hydeDocument === "string" &&
    normalizeRetrievalQuery(input.hydeDocument).length > 0;
  const topRerankScore = input.reranked[0]?.rerankScore ?? 0;
  const secondRerankScore = input.reranked[1]?.rerankScore ?? 0;
  const ambiguityReasons = Array.from(
    new Set(
      [
        queryTokenCount > 0 && queryTokenCount < 4 ? "short_query" : null,
        queryTokenCount > 0 &&
        queryTokenCount < 6 &&
        !input.normalizedQuery.includes('"') &&
        !CODE_IDENTIFIER_PATTERN.test(input.normalizedQuery)
          ? "weak_anchor"
          : null,
        Number(input.audioIntent) +
          Number(input.documentIntent) +
          Number(input.visualIntent) >
        1
          ? "mixed_intent"
          : null,
        expansionUsed ? "query_expanded" : null,
        hydeUsed ? "hyde_generated" : null,
        input.reranked.length > 1 && topRerankScore - secondRerankScore < 0.06
          ? "low_score_margin"
          : null,
        input.assembled.truncated ? "context_truncated" : null,
      ].filter((value): value is string => Boolean(value))
    )
  );
  const confidenceScore = Number(
    Math.max(
      0,
      Math.min(
        1,
        0.45 +
          Math.min(0.25, Math.max(0, topRerankScore) * 0.35) +
          Math.min(
            0.15,
            Math.max(0, topRerankScore - secondRerankScore) * 0.8
          ) +
          (queryTokenCount >= 6 ? 0.05 : 0) +
          (input.normalizedQuery.includes('"') ||
          CODE_IDENTIFIER_PATTERN.test(input.normalizedQuery)
            ? 0.06
            : 0) +
          (input.options?.sourceType ? 0.04 : 0) +
          (expansionUsed ? -0.04 : 0) -
          ambiguityReasons.length * 0.05
      )
    ).toFixed(3)
  );
  const resultSourceTypeMix = input.assembled.results.reduce<
    Record<string, number>
  >((acc, candidate) => {
    acc[candidate.sourceType] = (acc[candidate.sourceType] ?? 0) + 1;
    return acc;
  }, {});

  return {
    candidateCount: input.sortedCandidates.length,
    confidenceScore,
    contextTokenBudget: RETRIEVAL_CONTEXT_TOKEN_BUDGET,
    contextTokenCount: input.assembled.tokenCount,
    contextTruncated: input.assembled.truncated,
    corpus: input.corpus,
    expansionUsed,
    fusionCandidateCount: input.mergedCandidates.length,
    intent: {
      audio: input.audioIntent,
      document: input.documentIntent,
      visual: input.visualIntent,
    },
    latencyMs: input.latencyMs,
    lexicalCandidateCount: input.lexicalCandidateCount,
    hydeCandidateCount: input.hydeCandidateCount,
    hydeFallbackUsed: input.hydeFallbackUsed,
    hydeUsed,
    learnerBoostedCandidateCount: Array.from(
      input.learnerSignalBoosts.values()
    ).filter((signal) => signal.boost !== 1).length,
    queryCount: input.queryCount,
    queryShape: {
      charCount: input.normalizedQuery.length,
      hasCodeIdentifier: CODE_IDENTIFIER_PATTERN.test(input.normalizedQuery),
      hasQuestionMark: input.normalizedQuery.includes("?"),
      hasQuotedPhrase: input.normalizedQuery.includes('"'),
      provider: input.options?.provider ?? null,
      decomposedQueryCount: input.decomposedQueryCount,
      searchQueryCount: input.queryCount,
      sourceType: input.options?.sourceType ?? null,
      tokenCount: queryTokenCount,
    },
    rerankCandidateCount: input.rerankCandidates.length,
    rerankFallbackUsed: input.rerankFallbackUsed,
    rerankUsed: input.rerankCandidates.length > 0,
    resultCount: input.assembled.results.length,
    resultSourceTypeMix,
    sourceTypeBreakdown: input.sortedCandidates.reduce<Record<string, number>>(
      (acc, candidate) => {
        acc[candidate.sourceType] = (acc[candidate.sourceType] ?? 0) + 1;
        return acc;
      },
      {}
    ),
    topRerankScore,
    topResultSourceType: input.assembled.results[0]?.sourceType ?? null,
    ambiguityReasons,
    userId: input.options?.userId ?? null,
    workspaceId: input.options?.workspaceId ?? null,
  };
}

export const applyModalityScoreAdjustments = (
  score: number,
  candidate: VectorSearchResult,
  params: {
    audioIntent: boolean;
    documentIntent: boolean;
    preferredSourceTypes: Set<
      "pdf" | "image" | "video" | "audio" | "document" | "markdown" | "link"
    > | null;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    visualIntent: boolean;
  }
): number => {
  let nextScore = score;

  if (params.visualIntent) {
    if (candidate.sourceType === "video" || candidate.sourceType === "image") {
      nextScore *= 1.85;
    } else if (
      candidate.sourceType === "pdf" ||
      candidate.sourceType === "document" ||
      candidate.sourceType === "markdown" ||
      candidate.sourceType === "link"
    ) {
      nextScore *= 0.42;
    }
  }

  if (params.audioIntent) {
    if (candidate.sourceType === "audio") {
      nextScore *= 2.0;
    } else if (candidate.sourceType === "video") {
      nextScore *= 1.35;
    } else if (
      candidate.sourceType === "pdf" ||
      candidate.sourceType === "document" ||
      candidate.sourceType === "markdown" ||
      candidate.sourceType === "link"
    ) {
      nextScore *= 0.35;
    }
  }

  if (
    params.documentIntent &&
    (candidate.sourceType === "pdf" ||
      candidate.sourceType === "document" ||
      candidate.sourceType === "markdown")
  ) {
    nextScore *= 1.4;
  }

  if (
    params.sourceType === undefined &&
    params.preferredSourceTypes &&
    !params.preferredSourceTypes.has(candidate.sourceType)
  ) {
    nextScore *= 0.15;
  }

  return nextScore;
};

export const applyHeuristicScoreAdjustments = (
  score: number,
  candidate: VectorSearchResult,
  params: {
    audioIntent: boolean;
    normalizedQuery: string;
    visualIntent: boolean;
  }
): number => {
  const lexicalScore = lexicalOverlapScore(
    params.normalizedQuery,
    candidate.content
  );
  const exactPhrase = exactPhraseScore(
    params.normalizedQuery,
    candidate.content
  );
  const titleLexicalScore = candidate.title
    ? lexicalOverlapScore(params.normalizedQuery, candidate.title)
    : 0;
  const noisy = isLikelyNoisyText(candidate.content);

  let nextScore = score;
  nextScore += lexicalScore * 0.35;
  nextScore += exactPhrase * 0.28;

  if (
    (candidate.sourceType === "pdf" ||
      candidate.sourceType === "document" ||
      candidate.sourceType === "markdown") &&
    lexicalScore >= 0.25 &&
    !params.visualIntent &&
    !params.audioIntent
  ) {
    nextScore += 0.18;
  }

  if (noisy) {
    nextScore *= 0.3;
  }

  if (candidate.sourceType === "audio" && lexicalScore >= 0.16) {
    nextScore *= 1.2;
  }

  if (titleLexicalScore > 0 && lexicalScore > 0.08) {
    nextScore += Math.min(0.08, titleLexicalScore * 0.08);
  }

  return nextScore;
};

const scoreRetrievedCandidate = (
  candidate: FusionCandidate,
  params: {
    audioIntent: boolean;
    documentIntent: boolean;
    learnerBoost: number;
    normalizedQuery: string;
    preferredSourceTypes: Set<
      "pdf" | "image" | "video" | "audio" | "document" | "markdown" | "link"
    > | null;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    visualIntent: boolean;
  }
): FusionCandidate => {
  let nextScore = candidate.score + candidate.fusionScore;
  nextScore = applyModalityScoreAdjustments(nextScore, candidate, params);
  nextScore = applyHeuristicScoreAdjustments(nextScore, candidate, {
    audioIntent: params.audioIntent,
    normalizedQuery: params.normalizedQuery,
    visualIntent: params.visualIntent,
  });
  nextScore *= params.learnerBoost;

  return {
    ...candidate,
    score: nextScore,
  };
};

const searchForQuery = async (params: {
  candidateLimit: number;
  includeLexical?: boolean;
  metadata?: Record<string, unknown>;
  options?: {
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    provider?: string;
  };
  query: string;
  queryKind: RetrievalTraceSnapshot["queryKind"];
  queryEmbedding: number[];
  trace?: RetrievalTraceCollector;
  tracePath: RetrievalTraceSnapshot["path"];
  vectorStore: VectorStore;
}): Promise<Array<VectorSearchResult & { fusionScore: number }>> => {
  const searchOptions = {
    limit: params.candidateLimit,
    filter: {
      sourceType: params.options?.sourceType,
      provider: params.options?.provider,
    },
  };

  const trigramQuery = extractTrigramQuery(params.query);
  const includeLexical = params.includeLexical ?? true;
  const optionalSearch = async (
    signal: "lexical" | "trigram",
    search: () => Promise<VectorSearchResult[]>
  ): Promise<VectorSearchResult[]> => {
    try {
      return await search();
    } catch (error) {
      logWarn({
        eventName: "retrieval.optional_search_fallback",
        payload: {
          error: safeError(error),
          query: params.query,
          signal,
        },
      });
      return [];
    }
  };
  const [baseCandidates, lexicalCandidates, trigramCandidates] =
    await Promise.all([
      params.vectorStore.search(params.queryEmbedding, searchOptions),
      includeLexical
        ? optionalSearch("lexical", () =>
            params.vectorStore.searchLexical(params.query, searchOptions)
          )
        : Promise.resolve([]),
      includeLexical && trigramQuery
        ? optionalSearch("trigram", () =>
            params.vectorStore.searchTrigram(trigramQuery, searchOptions)
          )
        : Promise.resolve([]),
    ]);

  const visualIntent = hasVisualIntent(params.query);
  const audioIntent = hasAudioIntent(params.query);
  const documentIntent = hasDocumentIntent(params.query);
  const preferredSourceTypes = getPreferredSourceTypes({
    visual: visualIntent,
    audio: audioIntent,
    document: documentIntent,
  });

  const modalityCandidateLists = await Promise.all(
    params.options?.sourceType === undefined && preferredSourceTypes
      ? [...preferredSourceTypes].map((sourceType) =>
          params.vectorStore.search(params.queryEmbedding, {
            limit: Math.max(4, Math.floor(params.candidateLimit / 2)),
            filter: {
              provider: params.options?.provider,
              sourceType,
            },
          })
        )
      : []
  );

  emitRetrievalTrace(params.trace, {
    candidates: baseCandidates,
    path: params.tracePath,
    query: params.query,
    queryKind: params.queryKind,
    stage: "dense",
  });
  emitRetrievalTrace(params.trace, {
    candidates: lexicalCandidates,
    path: params.tracePath,
    query: params.query,
    queryKind: params.queryKind,
    stage: "lexical",
  });
  emitRetrievalTrace(params.trace, {
    candidates: trigramCandidates,
    path: params.tracePath,
    query: params.query,
    queryKind: params.queryKind,
    stage: "trigram",
  });
  emitRetrievalTrace(params.trace, {
    candidates: modalityCandidateLists.flat(),
    path: params.tracePath,
    query: params.query,
    queryKind: params.queryKind,
    stage: "modality-dense",
  });

  const fused = fuseCandidatesByRrf([
    baseCandidates.map((candidate) => ({
      ...candidate,
      score:
        candidate.score *
        (params.metadata?.hyde ? config.retrievalHydeCandidateWeight : 1),
      metadata: {
        ...candidate.metadata,
        ...params.metadata,
      },
    })),
    lexicalCandidates.map((candidate) => ({
      ...candidate,
      score: candidate.score * config.retrievalLexicalCandidateWeight,
      metadata: {
        ...candidate.metadata,
        retrievalSignal: "lexical",
      },
    })),
    trigramCandidates.map((candidate) => ({
      ...candidate,
      score: candidate.score * config.retrievalTrigramCandidateWeight,
      metadata: {
        ...candidate.metadata,
        retrievalSignal: "trigram",
      },
    })),
    ...modalityCandidateLists,
  ]).sort((a, b) => b.fusionScore - a.fusionScore);
  emitRetrievalTrace(params.trace, {
    candidates: fused,
    path: params.tracePath,
    query: params.query,
    queryKind: params.queryKind,
    stage: "query-fusion",
  });
  return fused;
};

export const retrieveRelevantChunks = async (
  vectorStore: VectorStore,
  query: string,
  options?: {
    limit?: number;
    userId?: string;
    workspaceId?: string;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    provider?: string;
    corpus?: Awaited<ReturnType<VectorStore["corpusStats"]>>;
    initialQueryEmbedding?: number[];
    initialQueryCandidates?: Array<
      VectorSearchResult & { fusionScore: number }
    >;
    queryEnhancementTasks?: QueryEnhancementTasks;
    trace?: RetrievalTraceCollector;
  }
): Promise<{
  context: string;
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>>;
  latencyMs: number;
  decision: RetrievalDecisionTelemetry;
  results: Array<{
    resourceId: string;
    fileId: string | null;
    sourceType:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    source: string;
    provider: string | null;
    title: string | null;
    chunkId: string;
    chunkIndex: number;
    page: number | null;
    startMs: number | null;
    endMs: number | null;
    content: string;
    score: number;
    rerankScore: number;
    metadata: Record<string, unknown>;
  }>;
}> => {
  const start = performance.now();
  const normalizedQuery = normalizeRetrievalQuery(query);
  if (!normalizedQuery) {
    throw new Error("A retrieval query is required.");
  }
  const visualIntent = hasVisualIntent(normalizedQuery);
  const audioIntent = hasAudioIntent(normalizedQuery);
  const documentIntent = hasDocumentIntent(normalizedQuery);
  const synthesisIntent = SYNTHESIS_INTENT_PATTERN.test(normalizedQuery);
  const preferredSourceTypes = getPreferredSourceTypes({
    visual: visualIntent,
    audio: audioIntent,
    document: documentIntent,
  });

  const limit = options?.limit ?? config.retrievalDefaultLimit;
  const queryEnhancementTasks =
    options?.queryEnhancementTasks ??
    startQueryEnhancementTasks(normalizedQuery);
  const [expansionResult, hydeResult] = await Promise.all([
    queryEnhancementTasks.expansion,
    queryEnhancementTasks.hyde,
  ]);
  const hydeFallbackUsed = queryEnhancementTasks.wasHydeFallbackUsed();
  const expandedQuery = expansionResult.value;
  const hydeDocument = hydeResult.value;
  const decomposedQueries = dedupeQueries(
    decomposeQuery(normalizedQuery)
  ).slice(0, 4);
  const decomposedQueryCount = decomposedQueries.length;
  const coverageQuery = synthesisIntent || decomposedQueryCount > 1;
  const candidateLimit = Math.max(
    limit,
    limit * config.retrievalCandidateMultiplier * (coverageQuery ? 2 : 1)
  );
  const searchQueries = dedupeQueries([
    normalizedQuery,
    expandedQuery ?? "",
    ...decomposedQueries,
  ]).slice(0, 4);
  const embeddingQueries = dedupeQueries([
    ...searchQueries,
    hydeDocument ?? "",
  ]);

  const queriesNeedingEmbeddings = options?.initialQueryEmbedding
    ? embeddingQueries.filter((value) => value !== normalizedQuery)
    : embeddingQueries;
  const embeddingStartedAt = performance.now();
  const embeddings =
    queriesNeedingEmbeddings.length > 0
      ? (
          await observeRetrievalProviderCall({
            operation: "embedding",
            provider: "cohere",
            run: () =>
              embedMultimodal(
                queriesNeedingEmbeddings.map((value) =>
                  textToMultimodalInput(value)
                ),
                { inputType: "search_query" }
              ),
          })
        ).embeddings
      : [];
  const embeddingLatencyMs = Math.round(performance.now() - embeddingStartedAt);
  const embeddingByQuery = new Map<string, number[]>();
  if (options?.initialQueryEmbedding) {
    embeddingByQuery.set(normalizedQuery, options.initialQueryEmbedding);
  }
  queriesNeedingEmbeddings.forEach((value, index) => {
    const embedding = embeddings[index];
    if (embedding) {
      embeddingByQuery.set(value, embedding);
    }
  });

  const searchStartedAt = performance.now();
  const querySearchResults = await Promise.all(
    searchQueries.map((searchQuery) => {
      if (searchQuery === normalizedQuery && options?.initialQueryCandidates) {
        return options.initialQueryCandidates;
      }
      const queryEmbedding = embeddingByQuery.get(searchQuery);
      if (!queryEmbedding) {
        throw new Error("Failed to compute query embedding.");
      }

      return searchForQuery({
        candidateLimit,
        includeLexical: searchQuery !== expandedQuery,
        options,
        query: searchQuery,
        queryKind:
          searchQuery === normalizedQuery
            ? "original"
            : searchQuery === expandedQuery
              ? "expanded"
              : "decomposed",
        queryEmbedding,
        trace: options?.trace,
        tracePath: "full",
        vectorStore,
      });
    })
  );
  const lexicalCandidateCount = querySearchResults.reduce(
    (total, results) =>
      total +
      results.filter((candidate) =>
        ["lexical", "trigram"].includes(
          typeof candidate.metadata.retrievalSignal === "string"
            ? candidate.metadata.retrievalSignal
            : ""
        )
      ).length,
    0
  );
  const hydeSearchResults =
    hydeDocument && embeddingByQuery.get(hydeDocument)
      ? await searchForQuery({
          candidateLimit,
          includeLexical: false,
          metadata: {
            hyde: true,
            retrievalSignal: "hyde",
          },
          options,
          query: hydeDocument,
          queryKind: "hyde",
          queryEmbedding: embeddingByQuery.get(hydeDocument) ?? [],
          trace: options?.trace,
          tracePath: "full",
          vectorStore,
        })
      : [];
  const hydeCandidateCount = hydeSearchResults.length;
  const searchLatencyMs = Math.round(performance.now() - searchStartedAt);
  const allSearchResults = [...querySearchResults, hydeSearchResults];

  const fusionStartedAt = performance.now();
  const fusedCandidates = fuseCandidatesByRrf(allSearchResults).sort(
    (a, b) => b.fusionScore - a.fusionScore
  );
  const mergedCandidates = diversifyByResource(
    preserveCandidateFloor({
      fused: fusedCandidates,
      preserved: querySearchResults[0] ?? [],
      total: fusedCandidates.length,
    }),
    adaptiveResourceDiversity({
      candidateCount: fusedCandidates.length,
      decomposedQueryCount,
    })
  );
  emitRetrievalTrace(options?.trace, {
    candidates: mergedCandidates,
    path: "full",
    query: normalizedQuery,
    queryKind: "original",
    stage: "global-fusion",
  });
  const fusionLatencyMs = Math.round(performance.now() - fusionStartedAt);
  const learnerSignalsStartedAt = performance.now();
  const learnerSignalBoosts =
    options?.userId && options.workspaceId
      ? await getLearnerSignalBoosts({
          candidates: mergedCandidates,
          userId: options.userId,
          workspaceId: options.workspaceId,
        })
      : new Map<string, { boost: number }>();
  const learnerSignalsLatencyMs = Math.round(
    performance.now() - learnerSignalsStartedAt
  );

  const sortedCandidates: FusionCandidate[] = mergedCandidates
    .map((candidate) =>
      scoreRetrievedCandidate(candidate, {
        audioIntent,
        documentIntent,
        learnerBoost: learnerSignalBoosts.get(candidate.chunkId)?.boost ?? 1,
        normalizedQuery,
        preferredSourceTypes,
        sourceType: options?.sourceType,
        visualIntent,
      })
    )
    .sort((a, b) => b.score - a.score);

  const sortedByModalityPreference =
    options?.sourceType === undefined && preferredSourceTypes
      ? [
          ...sortedCandidates.filter((candidate) =>
            preferredSourceTypes.has(candidate.sourceType)
          ),
          ...sortedCandidates.filter(
            (candidate) => !preferredSourceTypes.has(candidate.sourceType)
          ),
        ]
      : sortedCandidates;
  emitRetrievalTrace(options?.trace, {
    candidates: sortedByModalityPreference,
    path: "full",
    query: normalizedQuery,
    queryKind: "original",
    stage: "scored-pre-rerank",
  });

  const rerankCandidates = preserveCandidateFloor({
    fused: sortedByModalityPreference,
    preserved: querySearchResults[0] ?? [],
    total: Math.max(
      limit * 2,
      coverageQuery
        ? config.retrievalRerankExhaustiveLimit
        : config.retrievalRerankCandidateLimit
    ),
  });
  emitRetrievalTrace(options?.trace, {
    candidates: rerankCandidates,
    path: "full",
    query: normalizedQuery,
    queryKind: "original",
    stage: "rerank-input",
  });
  const fusionScoreByChunkId = new Map(
    rerankCandidates.map((candidate) => [
      candidate.chunkId,
      candidate.fusionScore,
    ])
  );
  let rerankFallbackUsed = false;

  if (rerankCandidates.length === 0) {
    const corpus = options?.corpus ?? (await vectorStore.corpusStats());
    const assembled = {
      context: "",
      results: [] as RetrievedCandidate[],
      tokenCount: 0,
      truncated: false,
    };
    const latencyMs = Math.round(performance.now() - start);
    const telemetry = buildRetrievalDecisionTelemetry({
      audioIntent,
      assembled,
      corpus,
      documentIntent,
      expandedQuery,
      latencyMs,
      learnerSignalBoosts,
      mergedCandidates,
      normalizedQuery,
      options,
      queryCount: searchQueries.length,
      decomposedQueryCount,
      querySearchResults: allSearchResults,
      lexicalCandidateCount,
      rerankCandidates,
      rerankFallbackUsed,
      reranked: [],
      hydeCandidateCount,
      hydeDocument,
      hydeFallbackUsed,
      sortedCandidates,
      visualIntent,
    });

    logInfo({
      eventName: "retrieval.decision",
      payload: telemetry as unknown as Record<string, unknown>,
    });
    logInfo({
      eventName: "retrieval.phase_timings",
      payload: {
        embeddingMs: embeddingLatencyMs,
        expansionMs: expansionResult.latencyMs,
        fusionMs: fusionLatencyMs,
        hydeMs: hydeResult.latencyMs,
        learnerSignalsMs: learnerSignalsLatencyMs,
        rerankMs: 0,
        responseShapingMs: Math.max(
          0,
          latencyMs -
            embeddingLatencyMs -
            expansionResult.latencyMs -
            hydeResult.latencyMs -
            searchLatencyMs -
            fusionLatencyMs -
            learnerSignalsLatencyMs
        ),
        searchMs: searchLatencyMs,
        totalMs: latencyMs,
        workspaceId: options?.workspaceId ?? null,
      },
    });
    recordRetrievalQualityTelemetry({ decision: telemetry, path: "slow" });
    emitRetrievalTrace(options?.trace, {
      candidates: [],
      path: "full",
      query: normalizedQuery,
      queryKind: "original",
      stage: "final",
    });

    return {
      context: "",
      decision: telemetry,
      latencyMs,
      corpus,
      results: [],
    };
  }

  const rerankStartedAt = performance.now();
  const reranked = await observeRetrievalProviderCall({
    operation: "rerank",
    provider: "apollo",
    run: () =>
      rerank({
        model: apollo.rerankingModel("apollo-reranking"),
        documents: rerankCandidates.map((candidate) =>
          candidate.startMs === null
            ? candidate.content
            : `[${formatDuration(candidate.startMs)}-${formatDuration(candidate.endMs ?? candidate.startMs)}] ${candidate.content}`
        ),
        query: normalizedQuery,
        topN: limit,
      }),
  })
    .then(({ ranking }) =>
      ranking.map((item) => ({
        ...rerankCandidates[item.originalIndex],
        fusionScore:
          fusionScoreByChunkId.get(
            rerankCandidates[item.originalIndex]?.chunkId
          ) ?? 0,
        rerankScore: item.score,
      }))
    )
    .catch(async (error) => {
      rerankFallbackUsed = true;
      const fallback = await observeRetrievalProviderCall({
        operation: "rerank_fallback",
        provider: "cohere",
        run: () =>
          rerankByCohereWithQueryEmbedding(
            embeddingByQuery.get(normalizedQuery) ?? [],
            rerankCandidates,
            limit
          ),
      });
      if (fallback.length > 0) {
        return fallback.map((candidate) => ({
          ...candidate,
          fusionScore: fusionScoreByChunkId.get(candidate.chunkId) ?? 0,
          rerankScore: candidate.score,
        }));
      }

      logWarn({
        eventName: "retrieval.rerank_fallback",
        payload: {
          candidateCount: rerankCandidates.length,
          error: safeError(error),
        },
      });

      return rerankCandidates.slice(0, limit).map((candidate) => ({
        ...candidate,
        fusionScore: candidate.fusionScore,
        rerankScore: candidate.score,
      }));
    });
  const rerankLatencyMs = Math.round(performance.now() - rerankStartedAt);
  emitRetrievalTrace(options?.trace, {
    candidates: reranked,
    path: "full",
    query: normalizedQuery,
    queryKind: "original",
    stage: "rerank-output",
  });

  const responseShapingStartedAt = performance.now();
  const shouldAbstain = shouldAbstainFromRetrieval({
    audioIntent,
    decomposedQueryCount,
    sourceType: options?.sourceType,
    synthesisIntent,
    topRerankScore: reranked[0]?.rerankScore ?? null,
    visualIntent,
  });
  const acceptedReranked = shouldAbstain ? [] : reranked;
  const adjacentByChunkId = new Map<string, VectorSearchResult[]>(
    await Promise.all(
      acceptedReranked
        .filter((candidate) => isFragmentaryChunk(candidate.content))
        .map(
          async (candidate): Promise<[string, VectorSearchResult[]]> => [
            candidate.chunkId,
            await vectorStore.getAdjacentChunks({
              after: 1,
              before: 1,
              chunkIndex: candidate.chunkIndex,
              resourceId: candidate.resourceId,
            }),
          ]
        )
    )
  );

  const assembled = buildContextAwareResults(
    acceptedReranked,
    adjacentByChunkId,
    RETRIEVAL_CONTEXT_TOKEN_BUDGET
  );
  const corpus = options?.corpus ?? (await vectorStore.corpusStats());
  const responseShapingLatencyMs = Math.round(
    performance.now() - responseShapingStartedAt
  );

  const latencyMs = Math.round(performance.now() - start);
  const telemetry = buildRetrievalDecisionTelemetry({
    audioIntent,
    assembled,
    corpus,
    documentIntent,
    expandedQuery,
    latencyMs,
    learnerSignalBoosts,
    mergedCandidates,
    normalizedQuery,
    options,
    queryCount: searchQueries.length,
    decomposedQueryCount,
    querySearchResults: allSearchResults,
    lexicalCandidateCount,
    rerankCandidates,
    rerankFallbackUsed,
    reranked: acceptedReranked,
    hydeCandidateCount,
    hydeDocument,
    hydeFallbackUsed,
    sortedCandidates,
    visualIntent,
  });

  logInfo({
    eventName: "retrieval.decision",
    payload: telemetry as unknown as Record<string, unknown>,
  });
  logInfo({
    eventName: "retrieval.phase_timings",
    payload: {
      embeddingMs: embeddingLatencyMs,
      expansionMs: expansionResult.latencyMs,
      fusionMs: fusionLatencyMs,
      hydeMs: hydeResult.latencyMs,
      learnerSignalsMs: learnerSignalsLatencyMs,
      rerankMs: rerankLatencyMs,
      responseShapingMs: responseShapingLatencyMs,
      searchMs: searchLatencyMs,
      totalMs: latencyMs,
      workspaceId: options?.workspaceId ?? null,
    },
  });
  recordRetrievalQualityTelemetry({ decision: telemetry, path: "slow" });
  emitRetrievalTrace(options?.trace, {
    candidates: assembled.results,
    path: "full",
    query: normalizedQuery,
    queryKind: "original",
    stage: "final",
  });

  return {
    context: assembled.context,
    decision: telemetry,
    latencyMs,
    corpus,
    results: assembled.results,
  };
};

function buildQueryResultPreview(params: {
  audioIntent: boolean;
  decomposedQueryCount: number;
  limit: number;
  normalizedQuery: string;
  options?: {
    provider?: string;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    userId?: string;
    workspaceId?: string;
  };
  queryCandidates: Array<VectorSearchResult & { fusionScore: number }>;
  queryCount: number;
  visualIntent: boolean;
}) {
  const scoredCandidates = params.queryCandidates
    .filter(
      (candidate) =>
        candidate.score >= config.retrievalMinScore ||
        candidate.fusionScore >= 0.01
    )
    .map((candidate) =>
      scoreRetrievedCandidate(candidate, {
        audioIntent: params.audioIntent,
        documentIntent: hasDocumentIntent(params.normalizedQuery),
        learnerBoost: 1,
        normalizedQuery: params.normalizedQuery,
        preferredSourceTypes: getPreferredSourceTypes({
          audio: params.audioIntent,
          document: hasDocumentIntent(params.normalizedQuery),
          visual: params.visualIntent,
        }),
        sourceType: params.options?.sourceType,
        visualIntent: params.visualIntent,
      })
    )
    .sort((a, b) => b.score - a.score);

  const reranked = scoredCandidates.slice(0, params.limit).map((candidate) => ({
    ...candidate,
    rerankScore: candidate.score,
  }));
  const assembled = buildContextAwareResults(
    reranked,
    new Map(),
    FAST_PATH_CONTEXT_TOKEN_BUDGET
  );
  const telemetry = buildRetrievalDecisionTelemetry({
    audioIntent: params.audioIntent,
    assembled,
    corpus: {
      chunks: 0,
      embeddings: 0,
      resources: 0,
    },
    documentIntent: hasDocumentIntent(params.normalizedQuery),
    expandedQuery: null,
    latencyMs: 0,
    learnerSignalBoosts: new Map(),
    mergedCandidates: params.queryCandidates,
    normalizedQuery: params.normalizedQuery,
    options: params.options,
    decomposedQueryCount: params.decomposedQueryCount,
    queryCount: params.queryCount,
    querySearchResults: [params.queryCandidates],
    lexicalCandidateCount: params.queryCandidates.filter((candidate) =>
      ["lexical", "trigram"].includes(
        typeof candidate.metadata.retrievalSignal === "string"
          ? candidate.metadata.retrievalSignal
          : ""
      )
    ).length,
    rerankCandidates: [],
    rerankFallbackUsed: false,
    reranked,
    hydeCandidateCount: params.queryCandidates.filter(
      (candidate) => candidate.metadata.hyde === true
    ).length,
    hydeDocument: null,
    hydeFallbackUsed: false,
    sortedCandidates: scoredCandidates,
    visualIntent: params.visualIntent,
  });

  return {
    assembled,
    decision: telemetry,
    results: assembled.results,
    scoredCandidates,
  };
}

function compareResultOrders(
  left: Array<{ chunkId: string }>,
  right: Array<{ chunkId: string }>,
  limit: number
) {
  const boundedLimit = Math.max(1, limit);
  const leftIds = left.slice(0, boundedLimit).map((result) => result.chunkId);
  const rightIds = right.slice(0, boundedLimit).map((result) => result.chunkId);
  const leftSet = new Set(leftIds);
  const rightSet = new Set(rightIds);
  const overlap = Array.from(leftSet).filter((id) => rightSet.has(id)).length;
  const orderedMatches = leftIds.filter(
    (id, index) => rightIds[index] === id
  ).length;

  return {
    citationAgreement: leftIds.length > 0 ? orderedMatches / leftIds.length : 0,
    topKOverlap: leftIds.length > 0 ? overlap / leftIds.length : 0,
  };
}

function classifyQueryType(input: {
  audioIntent: boolean;
  documentIntent: boolean;
  normalizedQuery: string;
  queryShape: {
    hasCodeIdentifier: boolean;
    hasQuestionMark: boolean;
  };
  visualIntent: boolean;
}) {
  if (input.queryShape.hasCodeIdentifier) {
    return "code";
  }

  if (input.visualIntent) {
    return "visual";
  }

  if (input.audioIntent) {
    return "audio";
  }

  if (input.documentIntent) {
    return "document";
  }

  if (input.queryShape.hasQuestionMark || input.normalizedQuery.includes("?")) {
    return "question";
  }

  return "general";
}

function getCalibrationShadowSampleRate() {
  const parsed = Number.parseFloat(
    process.env.RETRIEVAL_SHADOW_SAMPLE_RATE ?? ""
  );
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_CALIBRATION_SHADOW_SAMPLE_RATE;
  }

  return Math.min(1, parsed);
}

function shouldRunCalibrationShadow() {
  return Math.random() < getCalibrationShadowSampleRate();
}

async function logCalibrationShadow(input: {
  audioIntent: boolean;
  confidence: number;
  fastLatencyMs: number;
  fastPreview: {
    results: Array<{ chunkId: string }>;
    scoredCandidates: FusionCandidate[];
  };
  normalizedQuery: string;
  options?: {
    provider?: string;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    userId?: string;
    workspaceId?: string;
  };
  routeReasons: string[];
  slowLatencyMs: number;
  slowResult: {
    decision: RetrievalDecisionTelemetry;
    results: Array<{ chunkId: string }>;
  };
  thresholdConfidence: number;
  visualIntent: boolean;
}) {
  const topFastScore = input.fastPreview.scoredCandidates[0]?.score ?? 0;
  const secondFastScore = input.fastPreview.scoredCandidates[1]?.score ?? 0;
  const calibration = {
    ...compareResultOrders(
      input.fastPreview.results,
      input.slowResult.results,
      Math.max(1, input.fastPreview.results.length)
    ),
    fastCandidateCount: input.fastPreview.scoredCandidates.length,
    fastLatencyMs: input.fastLatencyMs,
    topFastScore,
    topFastScoreMargin: topFastScore - secondFastScore,
    slowCandidateCount: input.slowResult.decision.candidateCount,
    slowLatencyMs: input.slowLatencyMs,
    thresholdDecisions: [0.6, 0.7, 0.8, 0.85, 0.9].map((threshold) => ({
      threshold,
      wouldTakeFast:
        input.thresholdConfidence >= threshold &&
        input.routeReasons.length === 0,
    })),
  };

  logInfo({
    eventName: "retrieval.calibration.shadow",
    payload: {
      audioIntent: input.audioIntent,
      calibration,
      confidence: input.confidence,
      expandedQueryUsed: input.slowResult.decision.expansionUsed,
      failureCluster: classifyQueryType({
        audioIntent: input.audioIntent,
        documentIntent: input.slowResult.decision.intent.document,
        normalizedQuery: input.normalizedQuery,
        queryShape: input.slowResult.decision.queryShape,
        visualIntent: input.visualIntent,
      }),
      path:
        input.thresholdConfidence >= FAST_PATH_CONFIDENCE_THRESHOLD
          ? "fast"
          : "slow",
      queryShape: input.slowResult.decision.queryShape,
      routeReasons: input.routeReasons,
      visualIntent: input.visualIntent,
      workspaceId: input.options?.workspaceId ?? null,
    } as Record<string, unknown>,
  });

  return calibration;
}

export const retrieveRelevantChunksAdaptive = async (
  vectorStore: VectorStore,
  query: string,
  options?: {
    limit?: number;
    mode?: "auto" | "fast" | "full";
    provider?: string;
    sourceType?:
      | "pdf"
      | "image"
      | "video"
      | "audio"
      | "document"
      | "markdown"
      | "link";
    userId?: string;
    workspaceId?: string;
    trace?: RetrievalTraceCollector;
  }
): Promise<RetrievalPathResult> => {
  const start = performance.now();
  const normalizedQuery = normalizeRetrievalQuery(query);
  if (!normalizedQuery) {
    throw new Error("A retrieval query is required.");
  }
  const visualIntent = hasVisualIntent(normalizedQuery);
  const audioIntent = hasAudioIntent(normalizedQuery);
  const documentIntent = hasDocumentIntent(normalizedQuery);
  const decomposedQueries = dedupeQueries(
    decomposeQuery(normalizedQuery)
  ).slice(0, 4);
  const decomposedQueryCount = decomposedQueries.length;
  const limit = options?.limit ?? config.retrievalDefaultLimit;
  const candidateLimit = Math.max(
    limit,
    limit * config.retrievalCandidateMultiplier
  );

  const queryEnhancementAbortController = new AbortController();
  const queryEnhancementTasks =
    options?.mode === "fast"
      ? undefined
      : startQueryEnhancementTasks(
          normalizedQuery,
          queryEnhancementAbortController.signal
        );

  const [fastEmbedding] = (
    await observeRetrievalProviderCall({
      operation: "embedding",
      provider: "cohere",
      run: () =>
        embedMultimodal([textToMultimodalInput(normalizedQuery)], {
          inputType: "search_query",
        }),
    })
  ).embeddings;
  if (!fastEmbedding) {
    throw new Error("Failed to compute query embedding.");
  }

  const fastQueryCandidates = await searchForQuery({
    candidateLimit,
    options,
    query: normalizedQuery,
    queryKind: "original",
    queryEmbedding: fastEmbedding,
    trace: options?.trace,
    tracePath: "fast",
    vectorStore,
  });
  const fastPreview = buildQueryResultPreview({
    audioIntent,
    decomposedQueryCount,
    limit,
    normalizedQuery,
    options,
    queryCandidates: fastQueryCandidates,
    queryCount: 1,
    visualIntent,
  });
  const routeReasons = fastPreview.decision.ambiguityReasons;
  const confidence = fastPreview.decision.confidenceScore;
  const shouldUseFast =
    options?.mode === "fast"
      ? true
      : options?.mode === "full"
        ? false
        : confidence >= FAST_PATH_CONFIDENCE_THRESHOLD &&
          routeReasons.length === 0;
  const fastLatencyMs = Math.round(performance.now() - start);
  emitRetrievalTrace(options?.trace, {
    candidates: fastPreview.scoredCandidates,
    path: "fast",
    query: normalizedQuery,
    queryKind: "original",
    stage: "scored-pre-rerank",
  });

  if (shouldUseFast) {
    queryEnhancementAbortController.abort(
      new Error("Fast retrieval path completed")
    );
    if (options?.mode !== "full" && shouldRunCalibrationShadow()) {
      void (async () => {
        try {
          const shadowStart = performance.now();
          const slowResult = await retrieveRelevantChunks(
            vectorStore,
            normalizedQuery,
            {
              limit,
              provider: options?.provider,
              sourceType: options?.sourceType,
              userId: options?.userId,
              workspaceId: options?.workspaceId,
              initialQueryCandidates: fastQueryCandidates,
              initialQueryEmbedding: fastEmbedding,
            }
          );
          await logCalibrationShadow({
            audioIntent,
            confidence,
            fastLatencyMs,
            fastPreview,
            normalizedQuery,
            options,
            routeReasons,
            slowLatencyMs: Math.round(performance.now() - shadowStart),
            slowResult,
            thresholdConfidence: confidence,
            visualIntent,
          });
        } catch (error) {
          logWarn({
            eventName: "retrieval.calibration.shadow_failed",
            payload: {
              error: safeError(error),
              workspaceId: options?.workspaceId ?? null,
            },
          });
        }
      })();
    }

    recordRetrievalQualityTelemetry({
      decision: fastPreview.decision,
      path: "fast",
    });
    emitRetrievalTrace(options?.trace, {
      candidates: fastPreview.results,
      path: "fast",
      query: normalizedQuery,
      queryKind: "original",
      stage: "final",
    });

    return {
      ambiguityReasons: routeReasons,
      confidence,
      context: fastPreview.assembled.context,
      corpus: null,
      decision: fastPreview.decision,
      latencyMs: fastLatencyMs,
      path: "fast",
      results: fastPreview.results,
    };
  }

  const slowResult = await retrieveRelevantChunks(
    vectorStore,
    normalizedQuery,
    {
      limit,
      provider: options?.provider,
      sourceType: options?.sourceType,
      userId: options?.userId,
      workspaceId: options?.workspaceId,
      initialQueryCandidates: fastQueryCandidates,
      initialQueryEmbedding: fastEmbedding,
      queryEnhancementTasks,
      trace: options?.trace,
    }
  );
  const slowLatencyMs = Math.round(performance.now() - start);
  const calibration = await logCalibrationShadow({
    audioIntent,
    confidence,
    fastLatencyMs,
    fastPreview,
    normalizedQuery,
    options,
    routeReasons,
    slowLatencyMs,
    slowResult,
    thresholdConfidence: confidence,
    visualIntent,
  });

  return {
    ambiguityReasons: routeReasons,
    confidence,
    context: slowResult.context,
    corpus: slowResult.corpus,
    calibration,
    decision: slowResult.decision,
    latencyMs: slowLatencyMs,
    path: "slow",
    results: slowResult.results,
  };
};
