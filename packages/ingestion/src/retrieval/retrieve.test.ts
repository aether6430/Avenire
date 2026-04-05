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
  getLearnerSignalBoosts: vi.fn(),
}));

vi.mock("ai", () => ({
  rerank: mocks.rerank,
}));

vi.mock("@avenire/ai", () => ({
  APOLLO_INGESTION_COHERE_EMBED_MODEL: "cohere-embed-model",
  APOLLO_INGESTION_GROQ_TRANSCRIPTION_MODEL: "groq-transcription-model",
  APOLLO_INGESTION_MISTRAL_IMAGE_DESCRIPTION_MODEL: "mistral-image-description-model",
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
}));

vi.mock("./learner-signals", () => ({
  getLearnerSignalBoosts: mocks.getLearnerSignalBoosts,
}));

import {
  applyHeuristicScoreAdjustments,
  applyModalityScoreAdjustments,
  buildChunkContext,
  buildContextAwareResults,
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
} from "./retrieve";

const makeCandidate = (
  overrides: Partial<VectorSearchResult> & Pick<VectorSearchResult, "chunkId" | "resourceId">
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

    const fused = fuseCandidatesByRrf([
      [shared, shared, other],
      [alsoShared],
    ]);

    expect(fused).toHaveLength(2);
    expect(fused.find((candidate) => candidate.chunkId === "shared")).toMatchObject({
      score: 0.8,
    });
    expect(
      fused.find((candidate) => candidate.chunkId === "shared")?.fusionScore
    ).toBeGreaterThan(
      fused.find((candidate) => candidate.chunkId === "other")?.fusionScore ?? 0
    );
  });

  it("scores lexical, phrase, trigram, and intent helpers as expected", () => {
    expect(getPreferredSourceTypes({ visual: true, audio: false, document: false })).toEqual(
      new Set(["video", "image"])
    );
    expect(getPreferredSourceTypes({ visual: true, audio: true, document: false })).toBeNull();

    expect(
      lexicalOverlapScore("cell membrane transport", "Transport across the cell membrane")
    ).toBeCloseTo(1);
    expect(exactPhraseScore("semi permeable membrane", "A semi permeable membrane regulates flow")).toBe(1);
    expect(extractTrigramQuery('find "ATP synthase" citation')).toBe("ATP synthase");
    expect(extractTrigramQuery("renderGraphQLSchema for tests")).toBe(
      "renderGraphQLSchema for tests"
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
      endMs: 15000,
    });

    expect(formatDuration(3723000)).toBe("1:02:03");
    expect(formatChunkLocation(timedChunk)).toEqual(["p.8", "0:05-0:15"]);
    expect(formatChunkHeader(timedChunk)).toBe("[Cell lecture, p.8, 0:05-0:15]");
    expect(isLikelyNoisyText("x264 cabac deblock threads=16")).toBe(true);
    expect(isLikelyNoisyText("Hello π")).toBe(false);
    expect(
      isFragmentaryChunk(`lowercase ${Array.from({ length: 25 }, () => "fragment").join(" ")}`)
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
    mocks.getLearnerSignalBoosts.mockResolvedValue(new Map());
    mocks.textToMultimodalInput.mockImplementation((value: string) => ({
      type: "text",
      text: value,
    }));
  });

  it("prefers visual sources, expands fragmentary chunks with adjacent context, and returns corpus stats", async () => {
    mocks.expandQuery.mockResolvedValue("cell membrane diagram labeled");
    mocks.embedMultimodal.mockResolvedValue({
      embeddings: [[0.1, 0.2], [0.3, 0.4]],
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
      endMs: 15000,
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
    const search = vi.fn(async (_embedding, options) => {
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
      ],
      {
        inputType: "search_query",
      }
    );
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
    expect(result.results[0]?.content).toContain(
      "Previous complete sentence about the membrane."
    );
    expect(result.context).toContain("[Cell lecture, 0:05-0:15]");
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
});
