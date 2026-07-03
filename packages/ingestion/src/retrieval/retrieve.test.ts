import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VectorSearchResult, VectorStore } from "./vector-store";

const mocks = vi.hoisted(() => ({
  rerank: vi.fn(),
  rerankingModel: vi.fn(() => "apollo-reranking-model"),
  embedMultimodal: vi.fn(),
  rerankByCohereWithQueryEmbedding: vi.fn(),
  textToMultimodalInput: vi.fn((value: string) => ({
    type: "text",
    text: value,
  })),
  expandQuery: vi.fn(),
  generateHydeDocument: vi.fn(),
  getLearnerSignalBoosts: vi.fn(),
}));

vi.mock("ai", () => ({
  rerank: mocks.rerank,
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_INGESTION_COHERE_EMBED_MODEL: "cohere-embed-model",
  APOLLO_INGESTION_GROQ_TRANSCRIPTION_MODEL: "groq-transcription-model",
  APOLLO_INGESTION_MISTRAL_IMAGE_DESCRIPTION_MODEL:
    "mistral-image-description-model",
  APOLLO_INGESTION_MISTRAL_OCR_MODEL: "mistral-ocr-model",
  apollo: {
    rerankingModel: mocks.rerankingModel,
  },
}));

vi.mock("../ingestion/embeddings", () => ({
  embedMultimodal: mocks.embedMultimodal,
  rerankByCohereWithQueryEmbedding: mocks.rerankByCohereWithQueryEmbedding,
  textToMultimodalInput: mocks.textToMultimodalInput,
}));

vi.mock("./query-expansion", () => ({
  expandQuery: mocks.expandQuery,
  generateHydeDocument: mocks.generateHydeDocument,
}));

vi.mock("./learner-signals", () => ({
  getLearnerSignalBoosts: mocks.getLearnerSignalBoosts,
}));

import {
  applyHeuristicScoreAdjustments,
  applyModalityScoreAdjustments,
  buildChunkContext,
  buildContextAwareResults,
  decomposeQuery,
  dedupeQueries,
  diversifyByResource,
  exactPhraseScore,
  extractTrigramQuery,
  formatChunkHeader,
  formatChunkLocation,
  formatDuration,
  fuseCandidatesByRrf,
  getPreferredSourceTypes,
  isFragmentaryChunk,
  isLikelyNoisyText,
  lexicalOverlapScore,
  retrieveRelevantChunks,
  retrieveRelevantChunksAdaptive,
} from "./retrieve";

const makeCandidate = (
  overrides: Partial<VectorSearchResult> &
    Pick<VectorSearchResult, "chunkId" | "resourceId">
): VectorSearchResult => ({
  chunkId: overrides.chunkId,
  chunkIndex: overrides.chunkIndex ?? 0,
  content:
    overrides.content ??
    "Complete sentence about osmosis and membranes for retrieval scoring.",
  contentHash: overrides.contentHash ?? null,
  endMs: overrides.endMs ?? null,
  fileId: overrides.fileId ?? null,
  metadata: overrides.metadata ?? {},
  page: overrides.page ?? null,
  provider: overrides.provider ?? null,
  resourceId: overrides.resourceId,
  score: overrides.score ?? 0.5,
  source: overrides.source ?? "https://example.com/resource",
  sourceType: overrides.sourceType ?? "pdf",
  startMs: overrides.startMs ?? null,
  title: overrides.title ?? "Retrieved chunk",
});

describe("retrieve helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.expandQuery.mockResolvedValue(null);
    mocks.generateHydeDocument.mockResolvedValue(null);
    mocks.getLearnerSignalBoosts.mockResolvedValue(new Map());
    mocks.rerankByCohereWithQueryEmbedding.mockResolvedValue([]);
  });

  it("dedupes queries, diversifies by resource, and fuses rankings with RRF", () => {
    expect(dedupeQueries(["  Osmosis  ", "osmosis", "", "Diffusion"])).toEqual([
      "Osmosis",
      "Diffusion",
    ]);

    expect(
      diversifyByResource(
        [
          { id: "a", resourceId: "r1" },
          { id: "b", resourceId: "r1" },
          { id: "c", resourceId: "r2" },
        ],
        1
      )
    ).toEqual([
      { id: "a", resourceId: "r1" },
      { id: "c", resourceId: "r2" },
    ]);

    const shared = makeCandidate({
      chunkId: "shared",
      resourceId: "r1",
      score: 0.7,
    });
    const alsoShared = makeCandidate({
      chunkId: "shared",
      resourceId: "r1",
      score: 0.8,
    });
    const other = makeCandidate({
      chunkId: "other",
      resourceId: "r2",
      score: 0.4,
    });

    const fused = fuseCandidatesByRrf([[shared, shared, other], [alsoShared]]);

    expect(fused).toHaveLength(2);
    expect(
      fused.find((candidate) => candidate.chunkId === "shared")
    ).toMatchObject({
      score: 0.8,
    });
    expect(
      fused.find((candidate) => candidate.chunkId === "shared")?.fusionScore
    ).toBeGreaterThan(
      fused.find((candidate) => candidate.chunkId === "other")?.fusionScore ?? 0
    );
  });

  it("decomposes compound queries", () => {
    expect(
      decomposeQuery(
        'Compare "GraphQL resolver" with calculateEigenValue and F = ma'
      )
    ).toEqual([
      "GraphQL resolver",
      'Compare "GraphQL resolver"',
      "calculateEigenValue",
      "F = ma",
    ]);
  });

  it("scores lexical, phrase, trigram, and intent helpers as expected", () => {
    expect(
      getPreferredSourceTypes({ visual: true, audio: false, document: false })
    ).toEqual(new Set(["video", "image"]));
    expect(
      getPreferredSourceTypes({ visual: true, audio: true, document: false })
    ).toBeNull();
    expect(
      getPreferredSourceTypes({ visual: false, audio: false, document: true })
    ).toEqual(new Set(["pdf", "document", "markdown", "link"]));

    expect(
      lexicalOverlapScore(
        "cell membrane transport",
        "Transport across the cell membrane"
      )
    ).toBeCloseTo(1);
    expect(
      exactPhraseScore(
        "semi permeable membrane",
        "A semi permeable membrane regulates flow"
      )
    ).toBe(1);
    expect(extractTrigramQuery('find "ATP synthase" citation')).toBe(
      "ATP synthase"
    );
    expect(extractTrigramQuery("renderGraphQLSchema for tests")).toBe(
      "renderGraphQLSchema for tests"
    );
    expect(extractTrigramQuery("find the .docx lecture notes")).toBe(
      "find the .docx lecture notes"
    );
    expect(extractTrigramQuery("quote the .pptx slide title")).toBe(
      "quote the .pptx slide title"
    );
    expect(extractTrigramQuery("plain search terms only")).toBeNull();
  });

  it("formats chunk metadata and identifies noisy or fragmentary content", () => {
    const timedChunk = makeCandidate({
      chunkId: "timed",
      resourceId: "r1",
      title: "Cell lecture",
      page: 8,
      startMs: 5000,
      endMs: 15_000,
    });

    expect(formatDuration(3_723_000)).toBe("1:02:03");
    expect(formatChunkLocation(timedChunk)).toEqual(["p.8", "0:05-0:15"]);
    expect(formatChunkHeader(timedChunk)).toBe(
      "[Cell lecture, p.8, 0:05-0:15]"
    );
    expect(isLikelyNoisyText("x264 cabac deblock threads=16")).toBe(true);
    expect(isLikelyNoisyText("Hello π")).toBe(false);
    expect(
      isFragmentaryChunk(
        `lowercase ${Array.from({ length: 25 }, () => "fragment").join(" ")}`
      )
    ).toBe(true);
    expect(isFragmentaryChunk("Short unfinished fragment")).toBe(false);
  });

  it("assembles context, truncates oversized content, and applies score adjustments", () => {
    const previous = makeCandidate({
      chunkId: "prev",
      resourceId: "r1",
      chunkIndex: 0,
      content: "Previous complete sentence.",
      title: "Lesson",
    });
    const fragment = makeCandidate({
      chunkId: "frag",
      resourceId: "r1",
      chunkIndex: 1,
      title: "Lesson",
      sourceType: "video",
      content: `lowercase ${Array.from({ length: 30 }, () => "fragment").join(" ")}`,
      startMs: 1000,
      endMs: 3000,
      score: 0.4,
    });

    expect(buildChunkContext([previous, fragment])).toContain("[Lesson]");

    const expanded = buildContextAwareResults(
      [
        {
          ...fragment,
          rerankScore: 0.92,
        },
      ],
      new Map([[fragment.chunkId, [previous]]]),
      500
    );
    expect(expanded.context).toContain("Previous complete sentence.");
    expect(expanded.results[0]?.content).toContain("[Lesson, 0:01-0:03]");

    const oversized = buildContextAwareResults(
      [
        {
          ...makeCandidate({
            chunkId: "big",
            resourceId: "r2",
            content: Array.from({ length: 120 }, () => "oversized").join(" "),
          }),
          rerankScore: 0.8,
        },
      ],
      new Map(),
      10
    );
    expect(oversized.truncated).toBe(true);
    expect(oversized.results[0]?.content.endsWith("[truncated]")).toBe(true);

    expect(
      applyModalityScoreAdjustments(1, fragment, {
        audioIntent: false,
        documentIntent: false,
        preferredSourceTypes: new Set(["video", "image"]),
        sourceType: undefined,
        visualIntent: true,
      })
    ).toBeGreaterThan(1.8);

    expect(
      applyHeuristicScoreAdjustments(0.5, previous, {
        audioIntent: false,
        normalizedQuery: "previous complete sentence",
        visualIntent: false,
      })
    ).toBeGreaterThan(0.5);
  });
});

describe("retrieveRelevantChunks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.expandQuery.mockResolvedValue(null);
    mocks.generateHydeDocument.mockResolvedValue(null);
    mocks.getLearnerSignalBoosts.mockResolvedValue(new Map());
    mocks.textToMultimodalInput.mockImplementation((value: string) => ({
      type: "text",
      text: value,
    }));
  });

  it("prefers visual sources, expands fragmentary chunks with adjacent context, and returns corpus stats", async () => {
    mocks.expandQuery.mockResolvedValue("cell membrane diagram labeled");
    mocks.generateHydeDocument.mockResolvedValue(
      "A cell membrane diagram labels the phospholipid bilayer, transport proteins, and diffusion gradients."
    );
    const embeddings = [
      [0.1, 0.2],
      [0.3, 0.4],
      [0.5, 0.6],
    ];
    mocks.embedMultimodal.mockResolvedValue({
      embeddings,
    });
    mocks.rerank.mockResolvedValue({
      ranking: [
        { originalIndex: 0, score: 0.98 },
        { originalIndex: 1, score: 0.44 },
      ],
    });
    mocks.getLearnerSignalBoosts.mockResolvedValue(
      new Map([["video-1", { boost: 1.1 }]])
    );

    const fragmentaryVideo = makeCandidate({
      chunkId: "video-1",
      resourceId: "res-video",
      sourceType: "video",
      title: "Cell lecture",
      content: `lowercase ${Array.from({ length: 30 }, () => "membrane").join(" ")}`,
      startMs: 5000,
      endMs: 15_000,
      score: 0.62,
    });
    const imageChunk = makeCandidate({
      chunkId: "image-1",
      resourceId: "res-image",
      sourceType: "image",
      title: "Cell diagram",
      content: "Diagram showing membrane transport.",
      score: 0.4,
    });
    const pdfChunk = makeCandidate({
      chunkId: "pdf-1",
      resourceId: "res-pdf",
      sourceType: "pdf",
      title: "Cell notes",
      content: "Paragraph from a textbook about membrane transport.",
      score: 0.58,
    });
    const hydeChunk = makeCandidate({
      chunkId: "hyde-1",
      resourceId: "res-hyde",
      sourceType: "markdown",
      title: "Membrane study notes",
      content: "Notes about phospholipid bilayers and transport proteins.",
      score: 0.61,
    });

    const corpusStats = vi.fn(async () => ({
      chunks: 3,
      embeddings: 3,
      resources: 3,
    }));
    const getAdjacentChunks = vi.fn(async () => [
      makeCandidate({
        chunkId: "video-0",
        resourceId: "res-video",
        sourceType: "video",
        title: "Cell lecture",
        chunkIndex: 0,
        content: "Previous complete sentence about the membrane.",
      }),
    ]);
    const search = vi.fn(async (embedding, options) => {
      if (embedding === embeddings[2]) {
        return [hydeChunk];
      }
      if (options.filter?.sourceType === "video") {
        return [fragmentaryVideo];
      }
      if (options.filter?.sourceType === "image") {
        return [imageChunk];
      }
      return [fragmentaryVideo, pdfChunk];
    });
    const searchLexical = vi.fn(async () => [pdfChunk]);
    const searchTrigram = vi.fn(async () => []);

    const vectorStore: VectorStore = {
      corpusStats,
      getAdjacentChunks,
      search,
      searchLexical,
      searchTrigram,
    };

    const result = await retrieveRelevantChunks(
      vectorStore,
      "show the cell membrane diagram",
      {
        limit: 2,
        userId: "user-1",
        workspaceId: "workspace-1",
      }
    );

    expect(mocks.embedMultimodal).toHaveBeenCalledWith(
      [
        { type: "text", text: "show the cell membrane diagram" },
        { type: "text", text: "cell membrane diagram labeled" },
        {
          type: "text",
          text: "A cell membrane diagram labels the phospholipid bilayer, transport proteins, and diffusion gradients.",
        },
      ],
      {
        inputType: "search_query",
      }
    );
    expect(searchLexical).toHaveBeenCalledTimes(2);
    expect(searchTrigram).not.toHaveBeenCalled();
    expect(
      search.mock.calls.some((call) => call[1]?.filter?.sourceType === "video")
    ).toBe(true);
    expect(
      search.mock.calls.some((call) => call[1]?.filter?.sourceType === "image")
    ).toBe(true);
    expect(getAdjacentChunks).toHaveBeenCalledWith({
      after: 1,
      before: 1,
      chunkIndex: 0,
      resourceId: "res-video",
    });
    expect(mocks.getLearnerSignalBoosts).toHaveBeenCalled();
    expect(result.corpus).toEqual({
      chunks: 3,
      embeddings: 3,
      resources: 3,
    });
    expect(result.results[0]?.chunkId).toBe("video-1");
    expect(result.decision.hydeUsed).toBe(true);
    expect(result.decision.hydeCandidateCount).toBeGreaterThan(0);
    expect(result.results[0]?.content).toContain(
      "Previous complete sentence about the membrane."
    );
    expect(result.context).toContain("[Cell lecture, 0:05-0:15]");
  });

  it("falls back to the normalized query when query expansion throws", async () => {
    mocks.expandQuery.mockRejectedValue(new Error("expansion offline"));
    mocks.embedMultimodal.mockResolvedValue({
      embeddings: [[0.1, 0.2]],
    });
    mocks.rerank.mockResolvedValue({
      ranking: [{ originalIndex: 0, score: 0.91 }],
    });

    const pdfChunk = makeCandidate({
      chunkId: "pdf-1",
      resourceId: "res-pdf",
      sourceType: "pdf",
      title: "Membrane paper",
      content: "Quoted paragraph about a semi permeable membrane.",
      score: 0.77,
    });

    const vectorStore: VectorStore = {
      corpusStats: vi.fn(async () => ({
        chunks: 1,
        embeddings: 1,
        resources: 1,
      })),
      getAdjacentChunks: vi.fn(async () => []),
      search: vi.fn(async () => [pdfChunk]),
      searchLexical: vi.fn(async () => []),
      searchTrigram: vi.fn(async () => []),
    };

    const result = await retrieveRelevantChunks(vectorStore, "osmosis", {
      limit: 1,
      userId: "user-1",
      workspaceId: "workspace-1",
    });

    expect(mocks.embedMultimodal).toHaveBeenCalledWith(
      [{ type: "text", text: "osmosis" }],
      {
        inputType: "search_query",
      }
    );
    expect(result.results[0]?.chunkId).toBe("pdf-1");
  });

  it("falls back to Cohere reranking when the primary reranker fails", async () => {
    mocks.expandQuery.mockResolvedValue(null);
    mocks.embedMultimodal.mockResolvedValue({
      embeddings: [[0.7, 0.8]],
    });
    mocks.rerank.mockRejectedValue(new Error("rerank unavailable"));

    const pdfChunk = makeCandidate({
      chunkId: "pdf-1",
      resourceId: "res-pdf",
      sourceType: "pdf",
      title: "Membrane paper",
      content: "Quoted paragraph about a semi permeable membrane.",
      score: 0.77,
    });
    const audioChunk = makeCandidate({
      chunkId: "audio-1",
      resourceId: "res-audio",
      sourceType: "audio",
      title: "Lecture audio",
      content: "Audio transcript about diffusion.",
      score: 0.3,
    });

    mocks.rerankByCohereWithQueryEmbedding.mockResolvedValue([pdfChunk]);

    const corpusStats = vi.fn(async () => ({
      chunks: 2,
      embeddings: 2,
      resources: 2,
    }));
    const getAdjacentChunks = vi.fn(async () => []);
    const search = vi.fn(async () => [pdfChunk, audioChunk]);
    const searchLexical = vi.fn(async () => [pdfChunk]);
    const searchTrigram = vi.fn(async () => []);

    const vectorStore: VectorStore = {
      corpusStats,
      getAdjacentChunks,
      search,
      searchLexical,
      searchTrigram,
    };

    const result = await retrieveRelevantChunks(
      vectorStore,
      "pdf paragraph quote",
      {
        limit: 1,
      }
    );

    expect(mocks.rerankByCohereWithQueryEmbedding).toHaveBeenCalledWith(
      [0.7, 0.8],
      expect.any(Array),
      1
    );
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      chunkId: "pdf-1",
      sourceType: "pdf",
      rerankScore: 0.77,
    });
    expect(getAdjacentChunks).not.toHaveBeenCalled();
  });

  it("short-circuits before reranking when search returns no candidates", async () => {
    mocks.expandQuery.mockResolvedValue(null);
    mocks.embedMultimodal.mockResolvedValue({
      embeddings: [[0.7, 0.8]],
    });
    mocks.rerank.mockResolvedValue({ ranking: [] });
    mocks.rerankByCohereWithQueryEmbedding.mockResolvedValue([]);

    const vectorStore: VectorStore = {
      corpusStats: vi.fn(async () => ({
        chunks: 0,
        embeddings: 0,
        resources: 0,
      })),
      getAdjacentChunks: vi.fn(async () => []),
      search: vi.fn(async () => []),
      searchLexical: vi.fn(async () => []),
      searchTrigram: vi.fn(async () => []),
    };

    const result = await retrieveRelevantChunks(vectorStore, "osmosis", {
      limit: 2,
    });

    expect(result.results).toEqual([]);
    expect(result.context).toBe("");
    expect(result.decision.candidateCount).toBe(0);
    expect(mocks.rerank).not.toHaveBeenCalled();
  });

  it("fails closed on whitespace-only retrieval queries before embeddings or search run", async () => {
    const vectorStore: VectorStore = {
      corpusStats: vi.fn(async () => ({
        chunks: 0,
        embeddings: 0,
        resources: 0,
      })),
      getAdjacentChunks: vi.fn(async () => []),
      search: vi.fn(async () => []),
      searchLexical: vi.fn(async () => []),
      searchTrigram: vi.fn(async () => []),
    };

    await expect(
      retrieveRelevantChunks(vectorStore, "   ", {
        limit: 2,
      })
    ).rejects.toThrow("A retrieval query is required.");

    expect(mocks.embedMultimodal).not.toHaveBeenCalled();
  });

  it("can route ordinary auto queries without source hints onto the fast path", async () => {
    const randomSpy = vi.spyOn(Math, "random").mockReturnValue(1);
    try {
      mocks.expandQuery.mockResolvedValue(null);
      mocks.embedMultimodal.mockResolvedValue({
        embeddings: [[0.9, 0.8]],
      });
      mocks.rerank.mockResolvedValue({
        ranking: [{ originalIndex: 0, score: 0.99 }],
      });

      const candidate = makeCandidate({
        chunkId: "fast-1",
        resourceId: "res-fast",
        sourceType: "pdf",
        title: "Water cycle lesson",
        content: "A detailed explanation of the water cycle process.",
        score: 0.99,
      });

      const vectorStore: VectorStore = {
        corpusStats: vi.fn(async () => ({
          chunks: 1,
          embeddings: 1,
          resources: 1,
        })),
        getAdjacentChunks: vi.fn(async () => []),
        search: vi.fn(async () => [candidate]),
        searchLexical: vi.fn(async () => []),
        searchTrigram: vi.fn(async () => []),
      };

      const result = await retrieveRelevantChunksAdaptive(
        vectorStore,
        "explain the complete water cycle process",
        {
          limit: 1,
          userId: "user-1",
          workspaceId: "workspace-1",
        }
      );

      expect(result.path).toBe("fast");
      expect(result.ambiguityReasons).not.toContain("no_source_hint");
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("fails closed on whitespace-only adaptive retrieval queries before embeddings or search run", async () => {
    const vectorStore: VectorStore = {
      corpusStats: vi.fn(async () => ({
        chunks: 0,
        embeddings: 0,
        resources: 0,
      })),
      getAdjacentChunks: vi.fn(async () => []),
      search: vi.fn(async () => []),
      searchLexical: vi.fn(async () => []),
      searchTrigram: vi.fn(async () => []),
    };

    await expect(
      retrieveRelevantChunksAdaptive(vectorStore, "   ", {
        limit: 1,
      })
    ).rejects.toThrow("A retrieval query is required.");

    expect(mocks.embedMultimodal).not.toHaveBeenCalled();
  });
});
