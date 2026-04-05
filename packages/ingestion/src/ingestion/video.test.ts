import { describe, expect, it, vi } from "vitest";

vi.mock("./link", () => ({
  ingestLink: vi.fn(),
}));

vi.mock("./provider-extractors", () => ({
  extractFromSupportedProvider: vi.fn(),
}));

vi.mock("../utils/ffmpeg", () => ({
  extractAudioFromVideoUrl: vi.fn(),
  extractAudioSegmentsFromVideoFile: vi.fn(),
  extractAudioSegmentsFromVideoUrl: vi.fn(),
  extractKeyframesFromVideoFile: vi.fn(),
  extractKeyframesFromVideoUrl: vi.fn(),
  getMediaDurationSeconds: vi.fn(),
}));

vi.mock("./transcription", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("../utils/safety", () => ({
  assertSafeUrl: vi.fn(),
}));

vi.mock("../config", () => ({
  config: {
    ingestionStageTimingLog: false,
    videoTranscriptionSegmentSeconds: 600,
  },
}));

import {
  buildVideoResource,
  canFallbackToLinkExtraction,
  cleanTranscriptText,
  isDirectMediaUrl,
  isLowQualityTranscript,
  splitTranscriptByTime,
} from "./video";

describe("video helpers", () => {
  it("cleans transcript text and drops codec noise", () => {
    expect(cleanTranscriptText("Hello\u0000   world\uFFFD")).toBe("Hello world");
    expect(cleanTranscriptText("x264 cabac deblock threads=16")).toBe("");
    expect(
      cleanTranscriptText("1 2 3 4 5 6 7 8 lecture content")
    ).toBe("lecture content");
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
      splitTranscriptByTime(["00:05 Opening concept", "00:25 Follow up detail"].join("\n"))
    ).toEqual([
      {
        startMs: 5000,
        endMs: 25000,
        text: "Opening concept",
      },
      {
        startMs: 25000,
        endMs: 55000,
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
      endMs: 30000,
    });
    expect(windows[1]).toMatchObject({
      startMs: 30000,
      endMs: 60000,
    });
  });

  it("detects low-quality transcripts", () => {
    expect(isLowQualityTranscript("")).toBe(true);
    expect(
      isLowQualityTranscript("one two three four five six seven")
    ).toBe(true);
    expect(
      isLowQualityTranscript(Array.from({ length: 20 }, () => "repeat").join(" "))
    ).toBe(true);
    expect(
      isLowQualityTranscript(
        Array.from({ length: 120 }, (_, index) => `token${index + 1}`).join(" ")
      )
    ).toBe(false);
  });

  it("detects direct media URLs and link-extraction fallbacks", () => {
    expect(isDirectMediaUrl("https://cdn.example.com/video.mp4?download=1")).toBe(true);
    expect(isDirectMediaUrl("https://example.com/watch?v=123")).toBe(false);

    expect(canFallbackToLinkExtraction("https://example.com/watch?v=123")).toBe(true);
    expect(canFallbackToLinkExtraction("https://cdn.example.com/video.mp4")).toBe(false);
    expect(canFallbackToLinkExtraction("ftp://example.com/video.mp4")).toBe(false);
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
          timestampMs: 10000,
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
    expect(resource.chunks[1]?.content).toContain("Definition of entropy for beginners");
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
    expect(resource.chunks[3]?.content).toContain("Nearby transcript: Definition of entropy for beginners");
  });
});
