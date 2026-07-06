import { describe, expect, it, vi } from "vitest";

vi.mock("./link", () => ({
  ingestLink: vi.fn(),
}));

vi.mock("./provider-extractors", () => ({
  extractFromSupportedProvider: vi.fn(),
}));

vi.mock("../utils/ffmpeg", () => ({
  extractAudioSegmentsFromVideoFile: vi.fn(),
  extractAudioFromVideoFile: vi.fn(),
  extractKeyframesFromVideoFile: vi.fn(),
  getMediaDurationSeconds: vi.fn(),
}));

vi.mock("./transcription", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("../utils/safety", () => ({
  assertMaxSize: vi.fn((name: string, size: number, maxSize: number) => {
    if (size > maxSize) {
      throw new Error(`${name} exceeds max size (${size} > ${maxSize} bytes).`);
    }
  }),
  assertResolvedRemoteUrlIsSafe: vi.fn(async (value: string) => new URL(value)),
  assertSafeUrl: vi.fn(),
  safeRemoteFetch: vi.fn(),
}));

vi.mock("../config", () => ({
  config: {
    ingestionStageTimingLog: false,
    remoteFetchTimeoutMs: 15_000,
    remoteVideoMaxBytes: 1024 * 1024,
    videoTranscriptionSegmentSeconds: 600,
  },
}));

import { extractKeyframesFromVideoFile } from "../utils/ffmpeg";
import {
  assertResolvedRemoteUrlIsSafe,
  assertSafeUrl,
  safeRemoteFetch,
} from "../utils/safety";
import { extractFromSupportedProvider } from "./provider-extractors";
import {
  buildVideoResource,
  canFallbackToLinkExtraction,
  cleanTranscriptText,
  ingestVideo,
  isDirectMediaUrl,
  isLowQualityTranscript,
  splitTranscriptByTime,
} from "./video";

describe("video helpers", () => {
  it("cleans transcript text and drops codec noise", () => {
    expect(cleanTranscriptText("Hello\u0000   world\uFFFD")).toBe(
      "Hello world"
    );
    expect(cleanTranscriptText("x264 cabac deblock threads=16")).toBe("");
    expect(cleanTranscriptText("1 2 3 4 5 6 7 8 lecture content")).toBe(
      "lecture content"
    );
  });

  it("builds transcript windows from explicit segments and filters empty results", () => {
    expect(
      splitTranscriptByTime("", [
        {
          startMs: -500,
          endMs: 100,
          text: "Intro section",
        },
        {
          startMs: 1200,
          endMs: 1800,
          text: "x264 cabac",
        },
      ])
    ).toEqual([
      {
        startMs: 0,
        endMs: 500,
        text: "Intro section",
      },
    ]);
  });

  it("builds transcript windows from timestamped lines", () => {
    expect(
      splitTranscriptByTime(
        ["00:05 Opening concept", "00:25 Follow up detail"].join("\n")
      )
    ).toEqual([
      {
        startMs: 5000,
        endMs: 25_000,
        text: "Opening concept",
      },
      {
        startMs: 25_000,
        endMs: 55_000,
        text: "Follow up detail",
      },
    ]);
  });

  it("falls back to coarse transcript windows for plain text", () => {
    const transcript = Array.from({ length: 80 }, () => "conceptual").join(" ");
    const windows = splitTranscriptByTime(transcript);

    expect(windows).toHaveLength(2);
    expect(windows[0]).toMatchObject({
      startMs: 0,
      endMs: 30_000,
    });
    expect(windows[1]).toMatchObject({
      startMs: 30_000,
      endMs: 60_000,
    });
  });

  it("detects low-quality transcripts", () => {
    expect(isLowQualityTranscript("")).toBe(true);
    expect(isLowQualityTranscript("one two three four five six seven")).toBe(
      true
    );
    expect(
      isLowQualityTranscript(
        Array.from({ length: 20 }, () => "repeat").join(" ")
      )
    ).toBe(true);
    expect(
      isLowQualityTranscript(
        Array.from({ length: 120 }, (_, index) => `token${index + 1}`).join(" ")
      )
    ).toBe(false);
  });

  it("detects direct media URLs and link-extraction fallbacks", () => {
    expect(
      isDirectMediaUrl("https://cdn.example.com/video.mp4?download=1")
    ).toBe(true);
    expect(isDirectMediaUrl("https://example.com/watch?v=123")).toBe(false);

    expect(canFallbackToLinkExtraction("https://example.com/watch?v=123")).toBe(
      true
    );
    expect(
      canFallbackToLinkExtraction("https://cdn.example.com/video.mp4")
    ).toBe(false);
    expect(canFallbackToLinkExtraction("ftp://example.com/video.mp4")).toBe(
      false
    );
    expect(canFallbackToLinkExtraction("notaurl")).toBe(false);
  });

  it("builds a video resource with metadata, transcript, and multimodal keyframe chunks", () => {
    const resource = buildVideoResource({
      source: "https://example.com/lesson",
      title: "Entropy 101",
      transcript: "unused because segments are provided",
      transcriptSegments: [
        {
          startMs: 0,
          endMs: 5000,
          text: "Definition of entropy for beginners.",
        },
      ],
      keyframes: [
        {
          timestampMs: 2500,
          imageBase64: "ZmFrZQ==",
          imageMimeType: "image/png",
          labels: ["  chart  ", " disorder "],
          ocrText: "Entropy increases",
          caption: "Slide overview",
        },
        {
          timestampMs: 10_000,
          labels: ["ignored without image"],
        },
      ],
      transcriptionMode: "segment-fallback",
      transcriptionError: "partial failure",
    });

    expect(resource.metadata).toMatchObject({
      hasTranscript: true,
      segmentCount: 1,
      keyframeCount: 2,
      transcriptionModel: "segment-fallback",
      transcriptionError: "partial failure",
    });
    expect(resource.chunks).toHaveLength(4);

    expect(resource.chunks[0]).toMatchObject({
      chunkIndex: 0,
      kind: "visualization",
      content: [
        "Video source: https://example.com/lesson",
        "Title: Entropy 101",
        "Transcription mode: segment-fallback",
      ].join("\n"),
      metadata: {
        sourceType: "video",
        source: "https://example.com/lesson",
        modality: "text",
        extra: {
          section: "video-metadata",
        },
      },
    });

    expect(resource.chunks[1]).toMatchObject({
      chunkIndex: 1,
      metadata: {
        startMs: 0,
        endMs: 5000,
        extra: {
          section: "video-transcript",
          modality: "mixed",
          keyframeCount: 1,
        },
      },
    });
    expect(resource.chunks[1]?.content).toContain(
      "Definition of entropy for beginners"
    );
    expect(resource.chunks[2]).toMatchObject({
      chunkIndex: 2,
      metadata: {
        startMs: 0,
        endMs: 5000,
        extra: {
          section: "video-transcript",
          modality: "mixed",
          keyframeCount: 1,
        },
      },
    });
    expect(resource.chunks[2]?.content).toContain("labels: chart, disorder");
    expect(resource.chunks[2]?.content).toContain("ocr: Entropy increases");

    expect(resource.chunks[3]).toMatchObject({
      chunkIndex: 3,
      kind: "visualization",
      metadata: {
        sourceType: "video",
        source: "https://example.com/lesson",
        startMs: 2500,
        endMs: 2500,
        modality: "mixed",
        extra: {
          section: "video-keyframe",
          keyframeIndex: 0,
        },
      },
      embeddingInput: {
        type: "multimodal",
        content: expect.arrayContaining([
          expect.objectContaining({
            type: "text",
          }),
          {
            type: "image_base64",
            image_base64: "ZmFrZQ==",
            mimeType: "image/png",
          },
        ]),
      },
    });
    expect(resource.chunks[3]?.content).toContain(
      "Nearby transcript: Definition of entropy for beginners"
    );
  });

  it("treats whitespace-only URLs as absent inline video sources", async () => {
    vi.clearAllMocks();

    const transcript = Array.from(
      { length: 20 },
      (_, index) => `concept${index + 1}`
    ).join(" ");

    const resource = await ingestVideo({
      url: "   ",
      transcript,
    });

    expect(assertSafeUrl).not.toHaveBeenCalled();
    expect(extractFromSupportedProvider).not.toHaveBeenCalled();
    expect(extractKeyframesFromVideoFile).not.toHaveBeenCalled();
    expect(resource.source).toMatch(/^video:inline:/);
    expect(resource.metadata).toMatchObject({
      hasTranscript: true,
      keyframeCount: 0,
    });
  });

  it("fetches provider media safely before ffmpeg receives local bytes", async () => {
    vi.clearAllMocks();
    vi.mocked(extractFromSupportedProvider).mockResolvedValue({
      provider: "reddit",
      content: "Video",
      mediaUrls: ["https://cdn.example.com/video.mp4"],
    });
    vi.mocked(assertResolvedRemoteUrlIsSafe).mockResolvedValue(
      new URL("https://cdn.example.com/video.mp4")
    );
    vi.mocked(safeRemoteFetch).mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    );
    vi.mocked(extractKeyframesFromVideoFile).mockResolvedValue([
      {
        timestampMs: 0,
        imageBase64: "ZmFrZQ==",
        imageMimeType: "image/png",
      },
    ]);

    await ingestVideo({
      url: "https://www.reddit.com/r/test/comments/1/video",
      transcript: Array.from({ length: 20 }, (_, index) => `word${index}`).join(
        " "
      ),
    });

    expect(assertResolvedRemoteUrlIsSafe).toHaveBeenCalledWith(
      "https://cdn.example.com/video.mp4"
    );
    expect(safeRemoteFetch).toHaveBeenCalledWith(
      "https://cdn.example.com/video.mp4",
      expect.objectContaining({
        timeoutMs: 15_000,
      })
    );
    expect(extractKeyframesFromVideoFile).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3]),
      "mp4"
    );
  });

  it("does not pass unsafe provider media URLs to ffmpeg", async () => {
    vi.clearAllMocks();
    vi.mocked(extractFromSupportedProvider).mockResolvedValue({
      provider: "reddit",
      content: "Video",
      mediaUrls: ["http://127.0.0.1/private.mp4"],
    });
    vi.mocked(assertResolvedRemoteUrlIsSafe).mockRejectedValue(
      new Error("Unsafe DNS address is not allowed for ingestion")
    );

    await expect(
      ingestVideo({ url: "https://www.reddit.com/r/test/comments/1/video" })
    ).rejects.toThrow(
      /requires transcript or extractable keyframes|Unsafe DNS/
    );
    expect(safeRemoteFetch).not.toHaveBeenCalled();
    expect(extractKeyframesFromVideoFile).not.toHaveBeenCalled();
  });
});
