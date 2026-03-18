import { apollo } from "@avenire/ai";
import { rerank } from "ai";
import { config } from "../config";
import {
  embedMultimodal,
  rerankByCohereWithQueryEmbedding,
  textToMultimodalInput,
} from "../ingestion/embeddings";
import { expandQuery } from "./query-expansion";
import type { VectorSearchResult, VectorStore } from "./vector-store";

const RETRIEVAL_CONTEXT_TOKEN_BUDGET = 2400;
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

type FusionCandidate = VectorSearchResult & {
  fusionScore: number;
};

type RankedCandidate = VectorSearchResult & {
  fusionScore?: number;
  rerankScore: number;
};

const normalizeWhitespace = (value: string): string =>
  value.replace(/\s+/g, " ").trim();

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

const dedupeQueries = (values: string[]): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value);
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

const diversifyByResource = <T extends { resourceId: string }>(
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

const fuseCandidatesByRrf = (
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

const getPreferredSourceTypes = (intent: {
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

const lexicalOverlapScore = (query: string, content: string): number => {
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

const exactPhraseScore = (query: string, content: string): number => {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length < 5) {
    return 0;
  }

  return content.toLowerCase().includes(normalizedQuery) ? 1 : 0;
};

const isLikelyNoisyText = (content: string): boolean => {
  const normalized = normalizeWhitespace(content);
  if (!normalized) {
    return true;
  }

  if (NOISY_TEXT_PATTERN.test(normalized)) {
    return true;
  }

  const printable = normalized.replace(/[^\x20-\x7E]/g, "");
  return printable.length / normalized.length < 0.8;
};

const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const formatChunkLocation = (candidate: VectorSearchResult): string[] => {
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

const formatChunkHeader = (candidate: VectorSearchResult): string => {
  const title =
    normalizeWhitespace(candidate.title ?? "") ||
    normalizeWhitespace(candidate.source) ||
    "Retrieved chunk";
  const location = formatChunkLocation(candidate);

  return location.length > 0
    ? `[${title}, ${location.join(", ")}]`
    : `[${title}]`;
};

const isFragmentaryChunk = (content: string): boolean => {
  const normalized = normalizeWhitespace(content);
  if (normalized.length < 120) {
    return false;
  }

  const startsMidSentence = FRAGMENT_START_PATTERN.test(normalized);
  const endsMidSentence = !FRAGMENT_END_PATTERN.test(normalized);

  return startsMidSentence || endsMidSentence;
};

const buildChunkContext = (chunks: VectorSearchResult[]): string =>
  chunks
    .map(
      (chunk) =>
        `${formatChunkHeader(chunk)}\n${normalizeWhitespace(chunk.content)}`
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

const buildContextAwareResults = (
  reranked: RankedCandidate[],
  adjacentByChunkId: Map<string, VectorSearchResult[]>,
  tokenBudget: number
): {
  context: string;
  results: RankedCandidate[];
  tokenCount: number;
  truncated: boolean;
} => {
  const results: RankedCandidate[] = [];
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

const applyModalityScoreAdjustments = (
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

const applyHeuristicScoreAdjustments = (
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

  const [baseCandidates, lexicalCandidates] = await Promise.all([
    params.vectorStore.search(params.queryEmbedding, searchOptions),
    params.vectorStore.searchLexical(params.query, searchOptions),
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
    ...modalityCandidateLists,
  ]).sort((a, b) => b.fusionScore - a.fusionScore);
};

export const retrieveRelevantChunks = async (
  vectorStore: VectorStore,
  query: string,
  options?: {
    limit?: number;
    sourceType?: "pdf" | "image" | "video" | "audio" | "markdown" | "link";
    provider?: string;
  }
): Promise<{
  context: string;
  corpus: Awaited<ReturnType<VectorStore["corpusStats"]>>;
  latencyMs: number;
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
  const normalizedQuery = normalizeWhitespace(query);
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

  const expandedQueries = await expandQuery(normalizedQuery);
  const searchQueries = dedupeQueries([
    normalizedQuery,
    ...expandedQueries,
  ]).slice(0, 5);

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

      console.warn(
        JSON.stringify({
          event: "retrieval_rerank_fallback",
          message:
            error instanceof Error ? error.message : "Unknown rerank error",
        })
      );

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
  const corpus = await vectorStore.corpusStats();

  const latencyMs = Math.round(performance.now() - start);
  console.log(
    JSON.stringify({
      contextTokenBudget: RETRIEVAL_CONTEXT_TOKEN_BUDGET,
      contextTokenCount: assembled.tokenCount,
      contextTruncated: assembled.truncated,
      event: "retrieval",
      expandedQueryCount: expandedQueries.length,
      expandedQueries,
      latencyMs,
      corpus,
      candidateCount: sortedCandidates.length,
      fusionCandidateCount: mergedCandidates.length,
      intent: {
        audio: audioIntent,
        document: documentIntent,
        visual: visualIntent,
      },
      lexicalCandidateCount: querySearchResults.reduce(
        (total, results) => total + results.length,
        0
      ),
      queryCount: searchQueries.length,
      rerankCandidateCount: rerankCandidates.length,
      resultCount: assembled.results.length,
      sourceTypeBreakdown: sortedCandidates.reduce<Record<string, number>>(
        (acc, candidate) => {
          acc[candidate.sourceType] = (acc[candidate.sourceType] ?? 0) + 1;
          return acc;
        },
        {}
      ),
    })
  );

  return {
    context: assembled.context,
    latencyMs,
    corpus,
    results: assembled.results,
  };
};
