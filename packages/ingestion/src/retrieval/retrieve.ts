import { apollo } from "@avenire/ai";
import { rerank } from "ai";
import { logInfo, logWarn, safeError } from "@avenire/observability";
import { config } from "../config";
import {
  embedMultimodal,
  rerankByCohereWithQueryEmbedding,
  textToMultimodalInput,
} from "../ingestion/embeddings";
import { expandQuery } from "./query-expansion";
import { getLearnerSignalBoosts } from "./learner-signals";
import type { VectorSearchResult, VectorStore } from "./vector-store";

const RETRIEVAL_CONTEXT_TOKEN_BUDGET = 2400;
const FAST_PATH_CONTEXT_TOKEN_BUDGET = 1200;
const FAST_PATH_CONFIDENCE_THRESHOLD = 0.82;
const DEFAULT_CALIBRATION_SHADOW_SAMPLE_RATE = 0.15;
const MAX_RESOURCE_DIVERSITY = 3;

const VISUAL_INTENT_PATTERN =
  /\b(video|image|frame|scene|look|see|show|visual|picture|skyline|diagram|screen)\b/i;
const AUDIO_INTENT_PATTERN =
  /\b(audio|sound|voice|spoken|speech|podcast|music|transcript|listen|hear)\b/i;
const DOCUMENT_INTENT_PATTERN =
  /\b(pdf|document|paper|chapter|page|citation|quote|paragraph|text)\b/i;
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

type RetrievalPathResult = {
  ambiguityReasons: string[];
  confidence: number;
  context: string;
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>> | null;
  latencyMs: number;
  path: "fast" | "slow";
  results: Array<{
    resourceId: string;
    fileId: string | null;
    sourceType: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
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
  calibration?: {
    citationAgreement: number;
    fastCandidateCount: number;
    fastLatencyMs: number;
    thresholdDecisions: Array<{ threshold: number; wouldTakeFast: boolean }>;
    topKOverlap: number;
    slowCandidateCount: number;
    slowLatencyMs: number;
  };
  decision: RetrievalDecisionTelemetry;
};

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
  intent: {
    audio: boolean;
    document: boolean;
    visual: boolean;
  };
  latencyMs: number;
  lexicalCandidateCount: number;
  learnerBoostedCandidateCount: number;
  queryCount: number;
  queryShape: {
    charCount: number;
    hasCodeIdentifier: boolean;
    hasQuestionMark: boolean;
    hasQuotedPhrase: boolean;
    provider: string | null;
    searchQueryCount: number;
    sourceType: "pdf" | "image" | "video" | "audio" | "markdown" | "link" | null;
    tokenCount: number;
  };
  rerankCandidateCount: number;
  rerankFallbackUsed: boolean;
  rerankUsed: boolean;
  resultCount: number;
  resultSourceTypeMix: Record<string, number>;
  sourceTypeBreakdown: Record<string, number>;
  topRerankScore: number;
  topResultSourceType: "pdf" | "image" | "video" | "audio" | "markdown" | "link" | null;
  userId: string | null;
  workspaceId: string | null;
}

export const normalizeRetrievalQuery = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

const countQueryTokens = (value: string): number =>
  normalizeRetrievalQuery(value).split(TOKEN_SPLIT_PATTERN).filter(Boolean).length;

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

export const diversifyByResource = <T extends { resourceId: string }>(
  rows: T[],
  maxPerResource: number
): T[] => {
  const counts = new Map<string, number>();
  const out: T[] = [];

  for (const row of rows) {
    const used = counts.get(row.resourceId) ?? 0;
    if (used >= maxPerResource) {
      continue;
    }

    counts.set(row.resourceId, used + 1);
    out.push(row);
  }

  return out;
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
}): Set<"pdf" | "image" | "video" | "audio" | "markdown" | "link"> | null => {
  const { visual, audio, document } = intent;

  if (visual && !audio && !document) {
    return new Set(["video", "image"]);
  }

  if (audio && !visual && !document) {
    return new Set(["audio", "video"]);
  }

  if (document && !visual && !audio) {
    return new Set(["pdf", "markdown", "link"]);
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
      break;
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: telemetry assembly is intentionally centralized here.
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
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
    userId?: string;
    workspaceId?: string;
  };
  querySearchResults: Array<VectorSearchResult[]>;
  queryCount: number;
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
    lexicalCandidateCount: input.querySearchResults.reduce(
      (total, results) => total + results.length,
      0
    ),
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
      "pdf" | "image" | "video" | "audio" | "markdown" | "link"
    > | null;
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
    visualIntent: boolean;
  }
): number => {
  let nextScore = score;

  if (params.visualIntent) {
    if (candidate.sourceType === "video" || candidate.sourceType === "image") {
      nextScore *= 1.85;
    } else if (
      candidate.sourceType === "pdf" ||
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
      candidate.sourceType === "markdown" ||
      candidate.sourceType === "link"
    ) {
      nextScore *= 0.35;
    }
  }

  if (
    params.documentIntent &&
    (candidate.sourceType === "pdf" || candidate.sourceType === "markdown")
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
    (candidate.sourceType === "pdf" || candidate.sourceType === "markdown") &&
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
      "pdf" | "image" | "video" | "audio" | "markdown" | "link"
    > | null;
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
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
  options?: {
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
    provider?: string;
  };
  query: string;
  queryEmbedding: number[];
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
  const [baseCandidates, lexicalCandidates, trigramCandidates] =
    await Promise.all([
      params.vectorStore.search(params.queryEmbedding, searchOptions),
      params.vectorStore.searchLexical(params.query, searchOptions),
      trigramQuery
        ? params.vectorStore.searchTrigram(trigramQuery, searchOptions)
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

  return fuseCandidatesByRrf([
    baseCandidates,
    lexicalCandidates,
    trigramCandidates,
    ...modalityCandidateLists,
  ]).sort((a, b) => b.fusionScore - a.fusionScore);
};

export const retrieveRelevantChunks = async (
  vectorStore: VectorStore,
  query: string,
  options?: {
    limit?: number;
    userId?: string;
    workspaceId?: string;
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
    provider?: string;
    corpus?: Awaited<ReturnType<VectorStore["corpusStats"]>>;
  }
): Promise<{
  context: string;
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>>;
  latencyMs: number;
  decision: RetrievalDecisionTelemetry;
  results: Array<{
    resourceId: string;
    fileId: string | null;
    sourceType: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
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
  const visualIntent = hasVisualIntent(normalizedQuery);
  const audioIntent = hasAudioIntent(normalizedQuery);
  const documentIntent = hasDocumentIntent(normalizedQuery);
  const preferredSourceTypes = getPreferredSourceTypes({
    visual: visualIntent,
    audio: audioIntent,
    document: documentIntent,
  });

  const limit = options?.limit ?? config.retrievalDefaultLimit;
  const candidateLimit = Math.max(
    limit,
    limit * config.retrievalCandidateMultiplier
  );

  const expandedQuery = await expandQuery(normalizedQuery);
  const searchQueries = dedupeQueries([
    normalizedQuery,
    expandedQuery ?? "",
  ]).slice(0, 2);

  const { embeddings } = await embedMultimodal(
    searchQueries.map((value) => textToMultimodalInput(value)),
    {
      inputType: "search_query",
    }
  );

  const querySearchResults = await Promise.all(
    searchQueries.map((searchQuery, index) => {
      const queryEmbedding = embeddings[index];
      if (!queryEmbedding) {
        throw new Error("Failed to compute query embedding.");
      }

      return searchForQuery({
        candidateLimit,
        options,
        query: searchQuery,
        queryEmbedding,
        vectorStore,
      });
    })
  );

  const mergedCandidates = diversifyByResource(
    fuseCandidatesByRrf(querySearchResults).sort(
      (a, b) => b.fusionScore - a.fusionScore
    ),
    MAX_RESOURCE_DIVERSITY
  );
  const learnerSignalBoosts =
    options?.userId && options.workspaceId
      ? await getLearnerSignalBoosts({
          candidates: mergedCandidates,
          userId: options.userId,
          workspaceId: options.workspaceId,
        })
      : new Map<string, { boost: number }>();

  const sortedCandidates: FusionCandidate[] = mergedCandidates
    .filter(
      (candidate) =>
        candidate.score >= config.retrievalMinScore ||
        candidate.fusionScore >= 0.01
    )
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

  const rerankCandidateCount = Math.max(
    limit * 2,
    Math.min(config.retrievalRerankCandidateLimit, candidateLimit)
  );
  const rerankCandidates = sortedByModalityPreference.slice(
    0,
    rerankCandidateCount
  );
  const fusionScoreByChunkId = new Map(
    rerankCandidates.map((candidate) => [
      candidate.chunkId,
      candidate.fusionScore,
    ])
  );
  let rerankFallbackUsed = false;

  const reranked = await rerank({
    model: apollo.rerankingModel("apollo-reranking"),
    documents: rerankCandidates.map((candidate) => candidate.content),
    query: normalizedQuery,
    topN: limit,
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
      const fallback = await rerankByCohereWithQueryEmbedding(
        embeddings[0] ?? [],
        rerankCandidates,
        limit
      );
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

  const adjacentByChunkId = new Map<string, VectorSearchResult[]>(
    await Promise.all(
      reranked
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
    reranked,
    adjacentByChunkId,
    RETRIEVAL_CONTEXT_TOKEN_BUDGET
  );
  const corpus =
    options?.corpus ?? (await vectorStore.corpusStats());

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
    querySearchResults,
    rerankCandidates,
    rerankFallbackUsed,
    reranked,
    sortedCandidates,
    visualIntent,
  });

  logInfo({
    eventName: "retrieval.decision",
    payload: telemetry as unknown as Record<string, unknown>,
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
  limit: number;
  normalizedQuery: string;
  options?: {
    provider?: string;
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
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
    queryCount: params.queryCount,
    querySearchResults: [params.queryCandidates],
    rerankCandidates: [],
    rerankFallbackUsed: false,
    reranked,
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
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
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
        input.thresholdConfidence >= threshold && input.routeReasons.length === 0,
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
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
    userId?: string;
    workspaceId?: string;
  }
): Promise<RetrievalPathResult> => {
  const start = performance.now();
  const normalizedQuery = normalizeRetrievalQuery(query);
  const visualIntent = hasVisualIntent(normalizedQuery);
  const audioIntent = hasAudioIntent(normalizedQuery);
  const documentIntent = hasDocumentIntent(normalizedQuery);
  const limit = options?.limit ?? config.retrievalDefaultLimit;
  const candidateLimit = Math.max(
    limit,
    limit * config.retrievalCandidateMultiplier
  );

  const [fastEmbedding] = (
    await embedMultimodal([textToMultimodalInput(normalizedQuery)], {
      inputType: "search_query",
    })
  ).embeddings;
  if (!fastEmbedding) {
    throw new Error("Failed to compute query embedding.");
  }

  const fastQueryCandidates = await searchForQuery({
    candidateLimit,
    options,
    query: normalizedQuery,
    queryEmbedding: fastEmbedding,
    vectorStore,
  });
  const fastPreview = buildQueryResultPreview({
    audioIntent,
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
        : confidence >= FAST_PATH_CONFIDENCE_THRESHOLD && routeReasons.length === 0;
  const fastLatencyMs = Math.round(performance.now() - start);

  if (shouldUseFast) {
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

  const slowResult = await retrieveRelevantChunks(vectorStore, normalizedQuery, {
    limit,
    provider: options?.provider,
    sourceType: options?.sourceType,
    userId: options?.userId,
    workspaceId: options?.workspaceId,
  });
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
