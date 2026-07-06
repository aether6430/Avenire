import { createHash } from "node:crypto";
import { logInfo } from "@avenire/observability";
import {
  normalizeRetrievalQuery,
  retrieveRelevantChunksAdaptive,
} from "./retrieval/retrieve";
import type { VectorStore } from "./retrieval/vector-store";
import {
  createWorkspaceRetrievalStore,
  type RecentRetrievalQuery,
  type WorkspaceRetrievalStore,
} from "./workspace-retrieval-cache";

const WHITESPACE_SPLIT_PATTERN = /\s+/;

export type RetrievalMode = "auto" | "fast" | "full";
export type RetrievalSourceType =
  | "pdf"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "markdown"
  | "link";

export interface WorkspaceRetrievalQuery {
  limit?: number;
  mode?: RetrievalMode;
  origin?: "api" | "chat" | "unknown";
  provider?: string;
  query: string;
  sourceType?: RetrievalSourceType;
  userId?: string;
  workspaceId: string;
}

type RetrievalResult = Awaited<
  ReturnType<typeof retrieveRelevantChunksAdaptive>
>;

export interface WorkspaceRetrievalResponse {
  ambiguityReasons: string[];
  cache: "hit" | "miss";
  confidence: number;
  context: string;
  corpus?: RetrievalResult["corpus"];
  corpusFingerprint: string;
  latencyMs: number;
  normalizedQuery: string;
  path: "fast" | "slow";
  queryShape: {
    charCount: number;
    hasCodeIdentifier: boolean;
    hasQuestionMark: boolean;
    limit: number | null;
    providerPresent: boolean;
    sourceType: RetrievalSourceType | null;
    tokenCount: number;
  };
  results: RetrievalResult["results"];
}

interface WarmupCandidate {
  query: string;
  sourceType?: RetrievalSourceType;
  userId?: string | null;
}

interface WorkspaceSummaryHintSource {
  conceptsCovered: string[];
  misconceptionsDetected: string[];
  subject: string | null;
  summaryText: string;
}

interface WorkspaceFileHintSource {
  name: string;
  page?: {
    properties?: {
      aliases?:
        | { type: "multi_select"; value: string[] }
        | { type: "text"; value: string };
      tags?: { type: "multi_select"; value: string[] };
      title?: { value: string };
    };
  } | null;
}

export interface WorkspaceRetrievalWarmupInput {
  chunkCount?: number;
  fileId?: string | null;
  jobId?: string | null;
  resourceCount?: number;
  workspaceId: string;
}

type WorkspaceRetrievalWarmupResult =
  | {
      attempted: 0;
      cacheHits: 0;
      cacheMisses: 0;
      candidateCount: 0;
      skipped: true;
      warmupReason: "delta_too_small" | "lease";
      warmed: 0;
    }
  | {
      attempted: number;
      cacheHits: number;
      cacheMisses: number;
      candidateCount: number;
      coldMissRate: number;
      coverage: number;
      skipped: false;
      warmupReason: "completed";
      warmed: number;
    };

interface WorkspaceRetrievalAdapters {
  listSessionSummaries(
    workspaceId: string,
    limit: number
  ): Promise<WorkspaceSummaryHintSource[]>;
  listWorkspaceFiles(workspaceId: string): Promise<WorkspaceFileHintSource[]>;
  loadCorpusFingerprint(workspaceId: string): Promise<string | null>;
  now(): Date;
  store: WorkspaceRetrievalStore;
  vectorStoreFactory(workspaceId: string): VectorStore;
}

const defaultWorkspaceRetrievalStore = createWorkspaceRetrievalStore();

async function createProductionAdapters(): Promise<WorkspaceRetrievalAdapters> {
  const [
    {
      getWorkspaceCorpusFingerprintMarker,
      listSessionSummariesForWorkspace,
      listWorkspaceFiles,
    },
    { PostgresVectorStore },
  ] = await Promise.all([
    import("@avenire/database"),
    import("./retrieval/postgres-vector-store"),
  ]);

  return {
    listSessionSummaries(workspaceId, limit) {
      return listSessionSummariesForWorkspace({ limit, workspaceId });
    },
    listWorkspaceFiles(workspaceId) {
      return listWorkspaceFiles(workspaceId);
    },
    loadCorpusFingerprint(workspaceId) {
      return getWorkspaceCorpusFingerprintMarker(workspaceId);
    },
    now() {
      return new Date();
    },
    store: defaultWorkspaceRetrievalStore,
    vectorStoreFactory(workspaceId) {
      return new PostgresVectorStore(workspaceId);
    },
  };
}

function countQueryTokens(value: string) {
  return value.split(WHITESPACE_SPLIT_PATTERN).filter(Boolean).length;
}

function buildQueryShape(
  normalizedQuery: string,
  input: WorkspaceRetrievalQuery
): WorkspaceRetrievalResponse["queryShape"] {
  return {
    charCount: normalizedQuery.length,
    hasCodeIdentifier: /(?:[A-Z0-9]+_[A-Z0-9_]+|[a-z]+[A-Z][A-Za-z0-9]*)/.test(
      normalizedQuery
    ),
    hasQuestionMark: normalizedQuery.includes("?"),
    limit: input.limit ?? null,
    providerPresent: Boolean(input.provider?.trim()),
    sourceType: input.sourceType ?? null,
    tokenCount: countQueryTokens(normalizedQuery),
  };
}

function buildCacheLogPayload(input: {
  cache: "hit" | "miss";
  corpusFingerprint: string;
  queryShape: WorkspaceRetrievalResponse["queryShape"];
  request: WorkspaceRetrievalQuery;
  response: Pick<
    WorkspaceRetrievalResponse,
    "ambiguityReasons" | "confidence" | "latencyMs" | "path"
  > & {
    results: WorkspaceRetrievalResponse["results"];
  };
}) {
  return {
    ambiguityReasons: input.response.ambiguityReasons,
    cache: input.cache,
    corpusFingerprint: input.corpusFingerprint,
    confidence: input.response.confidence,
    latencyMs: input.response.latencyMs,
    path: input.response.path,
    queryShape: input.queryShape,
    resultCount: input.response.results.length,
    sourceType: input.request.sourceType ?? null,
    userId: input.request.userId ?? null,
    workspaceId: input.request.workspaceId,
  };
}

function normalizeHistoryQuery(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function shortenQuery(value: string, maxLength: number) {
  const normalized = normalizeHistoryQuery(value);
  if (!normalized) {
    return null;
  }

  return normalized.length > maxLength
    ? normalized.slice(0, maxLength).trim()
    : normalized;
}

function collectFileHints(file: WorkspaceFileHintSource) {
  const hints = new Set<string>();
  const push = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }

    const normalized = shortenQuery(value, 180);
    if (normalized) {
      hints.add(normalized);
    }
  };

  push(file.name);
  push(file.name.replace(/\.[^.]+$/, ""));
  push(file.page?.properties?.title?.value);

  const aliasProperty = file.page?.properties?.aliases;
  if (
    aliasProperty?.type === "multi_select" &&
    Array.isArray(aliasProperty.value)
  ) {
    for (const alias of aliasProperty.value) {
      push(alias);
    }
  }

  if (aliasProperty?.type === "text") {
    push(aliasProperty.value);
  }

  const tagsProperty = file.page?.properties?.tags;
  if (
    tagsProperty?.type === "multi_select" &&
    Array.isArray(tagsProperty.value)
  ) {
    for (const tag of tagsProperty.value.slice(0, 3)) {
      push(`${file.name} ${tag}`);
    }
  }

  return hints;
}

function collectSummaryHints(summaries: WorkspaceSummaryHintSource[]) {
  const hints = new Set<string>();
  const questionPattern =
    /(?:^|[.!?]\s+)([^.!?]*\b(?:how|why|what|when|where|which|who|can you|could you|explain|help me understand)\b[^.!?]*)/gi;

  for (const summary of summaries) {
    if (summary.subject) {
      hints.add(summary.subject);
    }

    for (const concept of summary.conceptsCovered.slice(0, 4)) {
      const normalized = shortenQuery(concept, 180);
      if (normalized) {
        hints.add(normalized);
        if (summary.subject) {
          hints.add(`${summary.subject} ${normalized}`);
        }
      }
    }

    for (const misconception of summary.misconceptionsDetected.slice(0, 4)) {
      const normalized = shortenQuery(misconception, 180);
      if (normalized) {
        hints.add(normalized);
        if (summary.subject) {
          hints.add(`${summary.subject} ${normalized}`);
        }
      }
    }

    const text = shortenQuery(summary.summaryText, 180);
    if (!text) {
      continue;
    }

    hints.add(text);
    const questionSnippets = Array.from(text.matchAll(questionPattern))
      .map((match) => match[1]?.trim())
      .filter((value): value is string => Boolean(value));

    for (const snippet of questionSnippets.slice(0, 3)) {
      const normalized = shortenQuery(snippet, 180);
      if (normalized) {
        hints.add(normalized);
        if (summary.subject) {
          hints.add(`${summary.subject} ${normalized}`);
        }
      }
    }
  }

  return hints;
}

function collectRetrievalHints(input: {
  files: WorkspaceFileHintSource[];
  recentQueries: RecentRetrievalQuery[];
  summaries: WorkspaceSummaryHintSource[];
}) {
  const hints = new Map<string, WarmupCandidate>();
  const originPriority: Record<RecentRetrievalQuery["origin"], number> = {
    api: 1,
    chat: 0,
    unknown: 2,
  };

  const add = (candidate: WarmupCandidate) => {
    const normalized = shortenQuery(candidate.query, 220);
    if (!normalized) {
      return;
    }

    const key = `${candidate.userId ?? "workspace"}::${normalized.toLowerCase()}`;
    if (hints.has(key)) {
      return;
    }

    hints.set(key, {
      ...candidate,
      query: normalized,
    });
  };

  for (const query of [...input.recentQueries].sort((left, right) => {
    const originDelta =
      originPriority[left.origin] - originPriority[right.origin];
    if (originDelta !== 0) {
      return originDelta;
    }

    return right.createdAt.localeCompare(left.createdAt);
  })) {
    add({
      query: query.query,
      sourceType: query.sourceType ?? undefined,
      userId: query.origin === "chat" ? (query.userId ?? undefined) : undefined,
    });
  }

  for (const hint of collectSummaryHints(input.summaries)) {
    add({ query: hint });
  }

  for (const file of input.files) {
    for (const hint of collectFileHints(file)) {
      add({ query: hint });
    }
  }

  return Array.from(hints.values());
}

export async function queryWorkspaceWithAdapters(
  input: WorkspaceRetrievalQuery,
  adapters: WorkspaceRetrievalAdapters
): Promise<WorkspaceRetrievalResponse> {
  const start = performance.now();
  const normalizedQuery = normalizeRetrievalQuery(input.query);
  if (!normalizedQuery) {
    throw new Error("Query is required.");
  }

  const vectorStore = adapters.vectorStoreFactory(input.workspaceId);
  const latestUpdatedAt = await adapters.loadCorpusFingerprint(
    input.workspaceId
  );
  const corpusFingerprint = createHash("sha256")
    .update(
      JSON.stringify({
        latestUpdatedAt,
        workspaceId: input.workspaceId,
      })
    )
    .digest("hex");
  const queryShape = buildQueryShape(normalizedQuery, input);
  const cacheKey = adapters.store.createCacheKey({
    corpusFingerprint,
    limit: input.limit,
    mode: input.mode ?? "auto",
    provider: input.provider,
    query: normalizedQuery,
    sourceType: input.sourceType,
    userId: input.userId,
    workspaceUuid: input.workspaceId,
  });

  const cached =
    await adapters.store.getCachedResult<
      Omit<WorkspaceRetrievalResponse, "cache" | "latencyMs">
    >(cacheKey);
  if (cached) {
    const latencyMs = Math.round(performance.now() - start);
    const response = {
      ...cached,
      cache: "hit" as const,
      latencyMs,
    };

    logInfo({
      eventName: "retrieval.cache.hit",
      payload: buildCacheLogPayload({
        cache: "hit",
        corpusFingerprint,
        queryShape,
        request: input,
        response,
      }),
    });

    await adapters.store.recordRecentQuery({
      cache: "hit",
      confidence: response.confidence,
      createdAt: adapters.now().toISOString(),
      origin: input.origin ?? "unknown",
      path: response.path,
      provider: input.provider ?? null,
      query: response.normalizedQuery,
      sourceType: input.sourceType ?? null,
      userId: input.userId ?? null,
      workspaceUuid: input.workspaceId,
    });

    return response;
  }

  const retrieval = await retrieveRelevantChunksAdaptive(
    vectorStore,
    normalizedQuery,
    {
      limit: input.limit,
      mode: input.mode,
      provider: input.provider,
      sourceType: input.sourceType,
      userId: input.userId,
      workspaceId: input.workspaceId,
    }
  );
  const latencyMs = Math.round(performance.now() - start);
  const response: Omit<WorkspaceRetrievalResponse, "cache"> = {
    ambiguityReasons: retrieval.ambiguityReasons,
    confidence: retrieval.confidence,
    context: retrieval.context,
    corpus: retrieval.corpus ?? undefined,
    corpusFingerprint,
    latencyMs,
    normalizedQuery,
    path: retrieval.path,
    queryShape,
    results: retrieval.results,
  };

  await adapters.store.setCachedResult(cacheKey, response);

  logInfo({
    eventName: "retrieval.cache.miss",
    payload: buildCacheLogPayload({
      cache: "miss",
      corpusFingerprint,
      queryShape,
      request: input,
      response: {
        ambiguityReasons: response.ambiguityReasons,
        confidence: response.confidence,
        latencyMs: response.latencyMs,
        path: response.path,
        results: response.results,
      },
    }),
  });

  await adapters.store.recordRecentQuery({
    cache: "miss",
    confidence: response.confidence,
    createdAt: adapters.now().toISOString(),
    origin: input.origin ?? "unknown",
    path: response.path,
    provider: input.provider ?? null,
    query: response.normalizedQuery,
    sourceType: input.sourceType ?? null,
    userId: input.userId ?? null,
    workspaceUuid: input.workspaceId,
  });

  return {
    ...response,
    cache: "miss",
  };
}

export async function warmWorkspaceWithAdapters(
  input: WorkspaceRetrievalWarmupInput,
  adapters: WorkspaceRetrievalAdapters
): Promise<WorkspaceRetrievalWarmupResult> {
  const minChunks = Number.parseInt(
    process.env.RETRIEVAL_WARMUP_MIN_CHUNKS ?? "8",
    10
  );
  const chunkCount = input.chunkCount ?? 0;
  if (chunkCount < minChunks) {
    logInfo({
      eventName: "retrieval.warmup.skipped",
      payload: {
        chunkCount,
        minChunks,
        reason: "delta_too_small",
        workspaceId: input.workspaceId,
      },
    });

    return {
      attempted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      candidateCount: 0,
      skipped: true,
      warmupReason: "delta_too_small",
      warmed: 0,
    };
  }

  if (!(await adapters.store.acquireWarmupLease(input.workspaceId))) {
    logInfo({
      eventName: "retrieval.warmup.skipped",
      payload: {
        reason: "lease",
        workspaceId: input.workspaceId,
      },
    });

    return {
      attempted: 0,
      cacheHits: 0,
      cacheMisses: 0,
      candidateCount: 0,
      skipped: true,
      warmupReason: "lease",
      warmed: 0,
    };
  }

  const [recentQueries, summaries, files] = await Promise.all([
    adapters.store.listRecentQueries(input.workspaceId),
    adapters.listSessionSummaries(
      input.workspaceId,
      Number.parseInt(process.env.RETRIEVAL_WARMUP_SUMMARY_LIMIT ?? "8", 10)
    ),
    adapters.listWorkspaceFiles(input.workspaceId),
  ]);

  const candidateQueries = collectRetrievalHints({
    files,
    recentQueries,
    summaries,
  });
  const selectedQueries = candidateQueries.slice(
    0,
    Number.parseInt(process.env.RETRIEVAL_WARMUP_QUERY_LIMIT ?? "12", 10)
  );
  const cacheKeySet = new Set<string>();
  let cacheHits = 0;
  let cacheMisses = 0;
  let warmed = 0;

  for (const candidate of selectedQueries) {
    const key = `${candidate.userId ?? "workspace"}::${candidate.query.toLowerCase()}`;
    if (cacheKeySet.has(key)) {
      continue;
    }

    cacheKeySet.add(key);
    try {
      const result = await queryWorkspaceWithAdapters(
        {
          mode: "auto",
          query: candidate.query,
          sourceType: candidate.sourceType,
          userId: candidate.userId ?? undefined,
          workspaceId: input.workspaceId,
        },
        adapters
      );

      warmed += 1;
      if (result.cache === "hit") {
        cacheHits += 1;
      } else {
        cacheMisses += 1;
      }
    } catch (error) {
      logInfo({
        eventName: "retrieval.warmup.query_failed",
        payload: {
          error:
            error instanceof Error ? error.message : "Unknown warmup failure",
          query: candidate.query,
          workspaceId: input.workspaceId,
        },
      });
    }
  }

  const coverage =
    selectedQueries.length > 0 ? warmed / selectedQueries.length : 0;
  const coldMissRate = warmed > 0 ? cacheMisses / warmed : 0;

  logInfo({
    eventName: "retrieval.warmup.completed",
    payload: {
      attempted: selectedQueries.length,
      cacheHits,
      cacheMisses,
      candidateCount: candidateQueries.length,
      coldMissRate,
      coverage,
      fileId: input.fileId ?? null,
      jobId: input.jobId ?? null,
      resourceCount: input.resourceCount ?? null,
      skipped: false,
      warmed,
      workspaceId: input.workspaceId,
    },
  });

  return {
    attempted: selectedQueries.length,
    cacheHits,
    cacheMisses,
    candidateCount: candidateQueries.length,
    coldMissRate,
    coverage,
    skipped: false,
    warmupReason: "completed",
    warmed,
  };
}

export async function queryWorkspace(
  input: WorkspaceRetrievalQuery
): Promise<WorkspaceRetrievalResponse> {
  return queryWorkspaceWithAdapters(input, await createProductionAdapters());
}

export async function warmWorkspace(
  input: WorkspaceRetrievalWarmupInput
): Promise<WorkspaceRetrievalWarmupResult> {
  return warmWorkspaceWithAdapters(input, await createProductionAdapters());
}
