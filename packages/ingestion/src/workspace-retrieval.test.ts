import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { meter } from "@avenire/observability";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@avenire/observability", () => ({
  logInfo: vi.fn(),
  meter: vi.fn(),
}));

vi.mock("./retrieval/retrieve", () => ({
  normalizeRetrievalQuery: vi.fn((value: string) =>
    value.replace(/\s+/g, " ").trim()
  ),
  retrieveRelevantChunksAdaptive: vi.fn(),
}));

vi.mock("./runtime/redis-client", () => ({
  ensureManagedRedisClient: vi.fn(),
}));

import * as retrieveModule from "./retrieval/retrieve";
import * as redisClientModule from "./runtime/redis-client";
import {
  queryWorkspaceWithAdapters,
  type WorkspaceRetrievalQuery,
  warmWorkspaceWithAdapters,
} from "./workspace-retrieval";
import type {
  RecentRetrievalQuery,
  WorkspaceRetrievalStore,
} from "./workspace-retrieval-cache";
import { createWorkspaceRetrievalStore } from "./workspace-retrieval-cache";

const backendWorkspaceEventStreamSource = readFileSync(
  resolve(
    import.meta.dirname,
    "../../../apps/backend/src/workspace-event-stream.ts"
  ),
  "utf8"
);
const ingestionPackageSource = readFileSync(
  resolve(import.meta.dirname, "../package.json"),
  "utf8"
);

const mockRetrieveRelevantChunksAdaptive =
  retrieveModule.retrieveRelevantChunksAdaptive as unknown as ReturnType<
    typeof vi.fn
  >;
const mockEnsureManagedRedisClient =
  redisClientModule.ensureManagedRedisClient as unknown as ReturnType<
    typeof vi.fn
  >;
const mockMeter = vi.mocked(meter);

function createStoreStub(input?: {
  acquireWarmupLease?: () => Promise<boolean>;
  cachedResults?: Map<string, unknown>;
  recentQueries?: RecentRetrievalQuery[];
}) {
  const cachedResults = input?.cachedResults ?? new Map<string, unknown>();
  const recentQueries = input?.recentQueries ?? [];

  const store: WorkspaceRetrievalStore = {
    acquireWarmupLease: vi.fn(input?.acquireWarmupLease ?? (async () => true)),
    createCacheKey: vi.fn(
      (params) => `cache:${params.workspaceUuid}:${params.query}`
    ),
    getCachedResult: vi.fn(
      async (key) => (cachedResults.get(key) ?? null) as never
    ),
    listRecentQueries: vi.fn(async () => recentQueries),
    recordRecentQuery: vi.fn(async (query) => {
      recentQueries.unshift(query);
    }),
    setCachedResult: vi.fn(async (key, value) => {
      cachedResults.set(key, value);
    }),
  };

  return {
    cachedResults,
    recentQueries,
    store,
  };
}

function createAdapters(input?: {
  acquireWarmupLease?: () => Promise<boolean>;
  cachedResults?: Map<string, unknown>;
  files?: Array<{
    name: string;
    page?: {
      properties?: {
        aliases?:
          | { type: "text"; value: string }
          | { type: "multi_select"; value: string[] };
        tags?: { type: "multi_select"; value: string[] };
        title?: { value: string };
      };
    };
  }>;
  recentQueries?: RecentRetrievalQuery[];
  summaries?: Array<{
    conceptsCovered: string[];
    misconceptionsDetected: string[];
    subject: string | null;
    summaryText: string;
  }>;
}) {
  const storeState = createStoreStub({
    acquireWarmupLease: input?.acquireWarmupLease,
    cachedResults: input?.cachedResults,
    recentQueries: input?.recentQueries,
  });

  return {
    adapters: {
      listSessionSummaries: vi.fn(async () => input?.summaries ?? []),
      listWorkspaceFiles: vi.fn(async () => input?.files ?? []),
      loadCorpusFingerprint: vi.fn(async () => "fingerprint-marker"),
      now: vi.fn(() => new Date("2026-04-30T00:00:00.000Z")),
      store: storeState.store,
      vectorStoreFactory: vi.fn((workspaceId: string) => ({
        corpusStats: vi.fn(async () => ({
          chunks: 0,
          embeddings: 0,
          resources: 0,
        })),
        getAdjacentChunks: vi.fn(async () => []),
        search: vi.fn(async () => []),
        searchLexical: vi.fn(async () => []),
        searchTrigram: vi.fn(async () => []),
        workspaceId,
      })),
    },
    storeState,
  };
}

describe("workspace retrieval", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REDIS_URL = "";
    process.env.RETRIEVAL_WARMUP_MIN_CHUNKS = undefined;
    mockRetrieveRelevantChunksAdaptive.mockResolvedValue({
      ambiguityReasons: [],
      confidence: 0.91,
      context: "retrieved context",
      corpus: { chunks: 3, embeddings: 3, resources: 1 },
      decision: {
        ambiguityReasons: [],
        candidateCount: 2,
        confidenceScore: 0.91,
        contextTokenBudget: 1200,
        contextTokenCount: 32,
        contextTruncated: false,
        corpus: { chunks: 3, embeddings: 3, resources: 1 },
        expansionUsed: false,
        fusionCandidateCount: 2,
        intent: {
          audio: false,
          document: true,
          visual: false,
        },
        latencyMs: 12,
        learnerBoostedCandidateCount: 0,
        lexicalCandidateCount: 1,
        queryCount: 1,
        queryShape: {
          charCount: 12,
          hasCodeIdentifier: false,
          hasQuestionMark: false,
          hasQuotedPhrase: false,
          provider: null,
          searchQueryCount: 1,
          sourceType: "pdf",
          tokenCount: 2,
        },
        rerankCandidateCount: 2,
        rerankFallbackUsed: false,
        rerankUsed: true,
        resultCount: 1,
        resultSourceTypeMix: { pdf: 1 },
        sourceTypeBreakdown: { pdf: 1 },
        topResultSourceType: "pdf",
        topRerankScore: 0.91,
        userId: null,
        workspaceId: "ws_1",
      },
      latencyMs: 12,
      path: "slow",
      results: [
        {
          chunkId: "chunk_1",
          chunkIndex: 0,
          content: "retrieved snippet",
          endMs: null,
          fileId: "file_1",
          metadata: {},
          page: 1,
          provider: null,
          resourceId: "resource_1",
          rerankScore: 0.91,
          score: 0.88,
          source: "resource.pdf",
          sourceType: "pdf",
          startMs: null,
          title: "Resource",
        },
      ],
    });
  });

  it("records cache misses and caches query results through the seam", async () => {
    const { adapters, storeState } = createAdapters();
    const input: WorkspaceRetrievalQuery = {
      origin: "chat",
      query: " osmosis basics ",
      userId: "user_1",
      workspaceId: "ws_1",
    };

    const result = await queryWorkspaceWithAdapters(input, adapters);

    expect(result.cache).toBe("miss");
    expect(mockRetrieveRelevantChunksAdaptive).toHaveBeenCalledTimes(1);
    expect(adapters.store.recordRecentQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: "miss",
        origin: "chat",
        query: "osmosis basics",
        userId: "user_1",
        workspaceUuid: "ws_1",
      })
    );
    expect(storeState.cachedResults.size).toBe(1);
    expect(mockMeter).toHaveBeenCalledWith({
      eventName: "retrieval.cache.lookup",
      payload: expect.objectContaining({
        mode: "auto",
        origin: "chat",
        outcome: "miss",
        path: "slow",
      }),
    });
  });

  it("serves cached retrieval results through the same seam", async () => {
    const cachedResults = new Map<string, unknown>([
      [
        "cache:ws_1:osmosis basics",
        {
          ambiguityReasons: [],
          confidence: 0.95,
          context: "cached context",
          corpus: undefined,
          corpusFingerprint: "cached-fingerprint",
          normalizedQuery: "osmosis basics",
          path: "fast",
          queryShape: {
            charCount: 14,
            hasCodeIdentifier: false,
            hasQuestionMark: false,
            limit: null,
            providerPresent: false,
            sourceType: null,
            tokenCount: 2,
          },
          results: [],
        },
      ],
    ]);
    const { adapters } = createAdapters({ cachedResults });

    const result = await queryWorkspaceWithAdapters(
      {
        origin: "api",
        query: "osmosis basics",
        workspaceId: "ws_1",
      },
      adapters
    );

    expect(result.cache).toBe("hit");
    expect(result.context).toBe("cached context");
    expect(mockRetrieveRelevantChunksAdaptive).not.toHaveBeenCalled();
    expect(adapters.store.recordRecentQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        cache: "hit",
        origin: "api",
      })
    );
    expect(mockMeter).toHaveBeenCalledWith({
      eventName: "retrieval.cache.lookup",
      payload: expect.objectContaining({
        mode: "auto",
        origin: "api",
        outcome: "hit",
        path: "fast",
      }),
    });
  });

  it("starts retrieval when a cache probe exceeds the fast-path budget", async () => {
    const { adapters } = createAdapters();
    adapters.store.getCachedResult = vi.fn(
      () => new Promise<null>((resolve) => setTimeout(() => resolve(null), 250))
    );

    const startedAt = performance.now();
    const result = await queryWorkspaceWithAdapters(
      {
        origin: "api",
        query: "osmosis basics",
        workspaceId: "ws_1",
      },
      adapters
    );

    expect(result.cache).toBe("miss");
    expect(mockRetrieveRelevantChunksAdaptive).toHaveBeenCalledTimes(1);
    expect(performance.now() - startedAt).toBeLessThan(200);
  });

  it("warms retrieval candidates gathered from history, summaries, and files", async () => {
    const { adapters } = createAdapters({
      files: [
        {
          name: "Cell Membranes.pdf",
          page: {
            properties: {
              tags: {
                type: "multi_select",
                value: ["biology"],
              },
              title: { value: "Cell Membranes" },
            },
          },
        },
      ],
      recentQueries: [
        {
          cache: "miss",
          confidence: 0.8,
          createdAt: "2026-04-29T23:59:00.000Z",
          origin: "chat",
          path: "slow",
          provider: null,
          query: "osmosis basics",
          sourceType: null,
          userId: "user_1",
          workspaceUuid: "ws_1",
        },
      ],
      summaries: [
        {
          conceptsCovered: ["diffusion"],
          misconceptionsDetected: ["osmosis direction"],
          subject: "Biology",
          summaryText: "Can you explain osmosis direction through a membrane?",
        },
      ],
    });

    const result = await warmWorkspaceWithAdapters(
      {
        chunkCount: 12,
        workspaceId: "ws_1",
      },
      adapters
    );

    expect(result.skipped).toBe(false);
    if (result.skipped) {
      return;
    }

    expect(result.attempted).toBeGreaterThan(0);
    expect(result.warmed).toBe(result.attempted);
    expect(mockRetrieveRelevantChunksAdaptive).toHaveBeenCalled();
    expect(adapters.store.listRecentQueries).toHaveBeenCalledWith("ws_1");
    expect(adapters.listSessionSummaries).toHaveBeenCalled();
    expect(adapters.listWorkspaceFiles).toHaveBeenCalledWith("ws_1");
  });

  it("skips too-small warmup deltas before acquiring a lease", async () => {
    process.env.RETRIEVAL_WARMUP_MIN_CHUNKS = "8";
    const { adapters } = createAdapters();

    const result = await warmWorkspaceWithAdapters(
      {
        chunkCount: 3,
        workspaceId: "ws_1",
      },
      adapters
    );

    expect(result.skipped).toBe(true);
    expect(result.warmupReason).toBe("delta_too_small");
    expect(adapters.store.acquireWarmupLease).not.toHaveBeenCalled();
  });

  it("normalizes bare redis host strings through the shared ingestion export used by backend stream publishers", async () => {
    const actual = await vi.importActual<
      typeof import("./runtime/redis-client")
    >("./runtime/redis-client");

    expect(actual.normalizeRedisUrl("localhost:6379")).toBe(
      "redis://localhost:6379"
    );
    expect(actual.normalizeRedisUrl(" redis://cache.internal:6379 ")).toBe(
      "redis://cache.internal:6379"
    );
    expect(backendWorkspaceEventStreamSource).toContain(
      'from "@avenire/ingestion/runtime/redis-client"'
    );
    expect(backendWorkspaceEventStreamSource).not.toContain(
      "function normalizeRedisUrl("
    );
    expect(ingestionPackageSource).toContain('"./runtime/redis-client"');
    expect(ingestionPackageSource).toContain(
      '"./runtime/redis-client": "./src/runtime/redis-client.ts"'
    );
  });

  it("resolves REDIS_URL at call time", async () => {
    const redisClient = {
      connect: vi.fn(async () => undefined),
      isOpen: false,
      isReady: false,
      lPush: vi.fn(),
      lRange: vi.fn(),
      lTrim: vi.fn(),
      expire: vi.fn(),
      get: vi.fn(),
      set: vi.fn(async () => "OK"),
      on: vi.fn(),
    };
    mockEnsureManagedRedisClient.mockResolvedValue(redisClient);

    const store = createWorkspaceRetrievalStore();

    await store.setCachedResult("cache:key", { value: 1 });
    expect(mockEnsureManagedRedisClient).not.toHaveBeenCalled();

    process.env.REDIS_URL = "redis://example";

    await store.setCachedResult("cache:key-2", { value: 2 });

    expect(mockEnsureManagedRedisClient).toHaveBeenCalledTimes(1);
    expect(mockEnsureManagedRedisClient).toHaveBeenCalledWith(
      null,
      "redis://example",
      "workspace-retrieval"
    );
  });
});
