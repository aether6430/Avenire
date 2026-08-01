import { config } from "../config";
import {
  type ExtractedVideoKeyframe,
  extractAudioFromVideoFile,
  extractAudioSegmentsFromVideoFile,
  extractKeyframesFromVideoFile,
} from "../utils/ffmpeg";
import {
  assertMaxSize,
  assertResolvedRemoteUrlIsSafe,
  assertSafeUrl,
  safeRemoteFetch,
} from "../utils/safety";
import { semanticChunkText } from "./chunking";
import { ingestLink } from "./link";
import { extractFromSupportedProvider } from "./provider-extractors";
import { type TranscriptSegment, transcribeAudio } from "./transcription";
import type { CanonicalChunk, CanonicalResource } from "./types";

const logVideoStageTiming = (params: {
  stage: string;
  durationMs: number;
  source: string;
}) => {
  if (!config.ingestionStageTimingLog) {
    return;
  }

  console.log(
    JSON.stringify({
      event: "ingestion.video.stage_timing",
      ...params,
    })
  );
};

const stripControlChars = (value: string): string =>
  Array.from(value, (char) => {
    if (char === "\uFFFD") {
      return " ";
    }

    const codePoint = char.codePointAt(0) ?? 0;
    if (
      codePoint <= 0x08 ||
      codePoint === 0x0b ||
      codePoint === 0x0c ||
      (codePoint >= 0x0e && codePoint <= 0x1f) ||
      codePoint === 0x7f
    ) {
      return " ";
    }

    return char;
  }).join("");

export const sanitizeLooseText = (value: string): string =>
  stripControlChars(value).replace(/\s+/g, " ").trim();

export const cleanTranscriptText = (value: string): string => {
  const normalized = stripControlChars(value).replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (
    /(x264|mpeg-4|h\.264|cabac|deblock|bframes|keyint|qcomp|chroma_qp_offset|rc_lookahead|threads=)/i.test(
      normalized
    )
  ) {
    return "";
  }

  const words = normalized
    .split(" ")
    .map((word) => word.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter(Boolean);

  if (words.length === 0) {
    return "";
  }

  const numericRatio =
    words.filter((word) => /^\d+$/.test(word)).length / words.length;
  const shortRatio =
    words.filter((word) => word.length <= 2).length / words.length;

  const cleanedWords =
    numericRatio > 0.18 || shortRatio > 0.52
      ? words.filter((word) => !/^\d+$/.test(word) && word.length > 1)
      : words;

  return cleanedWords.join(" ").trim();
};

const subtitleTimestampMs = (value: string): number | null => {
  const match = value
    .trim()
    .match(/^(?:(\d{1,2}):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) {
    return null;
  }
  return (
    Number(match[1] ?? 0) * 3_600_000 +
    Number(match[2]) * 60_000 +
    Number(match[3]) * 1000 +
    Number(match[4])
  );
};

export const parseSubtitleSegments = (value: string): TranscriptSegment[] =>
  value
    .replace(/^WEBVTT[^\n]*\n+/i, "")
    .split(/\r?\n\s*\r?\n/)
    .flatMap((block) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      const timingIndex = lines.findIndex((line) => /\s*-->\s*/.test(line));
      if (timingIndex < 0) {
        return [];
      }
      const [rawStart, rawEndWithSettings] = lines[timingIndex]?.split(
        /\s+-->\s+/
      ) ?? ["", ""];
      const rawEnd = rawEndWithSettings?.split(/\s+/)[0] ?? "";
      const startMs = subtitleTimestampMs(rawStart ?? "");
      const endMs = subtitleTimestampMs(rawEnd);
      const text = cleanTranscriptText(
        lines
          .slice(timingIndex + 1)
          .join(" ")
          .replace(/<[^>]+>/g, "")
      );
      return startMs === null || endMs === null || !text
        ? []
        : [{ startMs, endMs, text }];
    });

export const windowTranscriptSegments = (
  segments: readonly TranscriptSegment[],
  options?: { maxChars?: number; windowMs?: number; overlapMs?: number }
): TranscriptSegment[] => {
  const maxChars = options?.maxChars ?? 900;
  const windowMs = options?.windowMs ?? 30_000;
  const overlapMs = options?.overlapMs ?? 5000;
  const cleaned = segments
    .map((segment) => ({ ...segment, text: cleanTranscriptText(segment.text) }))
    .filter((segment) => segment.text.length > 0)
    .sort((left, right) => left.startMs - right.startMs);
  const windows: TranscriptSegment[] = [];
  let startIndex = 0;
  while (startIndex < cleaned.length) {
    const first = cleaned[startIndex];
    if (!first) {
      break;
    }
    let endIndex = startIndex;
    let text = first.text;
    let endMs = first.endMs;
    while (endIndex + 1 < cleaned.length) {
      const next = cleaned[endIndex + 1];
      if (
        !next ||
        next.endMs - first.startMs > windowMs ||
        text.length + next.text.length + 1 > maxChars
      ) {
        break;
      }
      endIndex += 1;
      endMs = next.endMs;
      text = `${text} ${next.text}`;
    }
    windows.push({ startMs: first.startMs, endMs, text });
    if (endIndex === cleaned.length - 1) {
      break;
    }
    const nextStart = cleaned.findIndex(
      (segment, index) =>
        index > startIndex && segment.startMs >= endMs - overlapMs
    );
    startIndex = nextStart > startIndex ? nextStart : endIndex + 1;
  }
  return windows;
};

export const splitTranscriptByTime = (
  transcript: string,
  transcriptSegments?: TranscriptSegment[]
): Array<{ startMs: number; endMs: number; text: string }> => {
  if (transcriptSegments && transcriptSegments.length > 0) {
    return windowTranscriptSegments(transcriptSegments)
      .map((segment) => ({
        startMs: Math.max(0, segment.startMs),
        endMs: Math.max(segment.endMs, segment.startMs + 1000),
        text: cleanTranscriptText(segment.text),
      }))
      .filter((segment) => segment.text.length > 0);
  }

  const lines = transcript
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parsed = lines
    .map((line) => {
      const match = line.match(/^(\d{1,2}:)?\d{1,2}:\d{2}(?:\.\d+)?\s+(.+)$/);
      if (!match) {
        return null;
      }
      const raw = match[0].split(/\s+/, 2)[0] ?? "";
      const text = cleanTranscriptText(line.slice(raw.length).trim());
      if (!text) {
        return null;
      }
      const parts = raw.split(":").map(Number);
      const seconds =
        parts.length === 3
          ? (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0)
          : (parts[0] ?? 0) * 60 + (parts[1] ?? 0);

      return {
        startMs: Math.floor(seconds * 1000),
        text,
      };
    })
    .filter((value): value is { startMs: number; text: string } =>
      Boolean(value)
    );

  if (parsed.length > 0) {
    return parsed.map((item, index) => {
      const next = parsed[index + 1];
      return {
        startMs: item.startMs,
        endMs: next
          ? Math.max(item.startMs + 20_000, next.startMs)
          : item.startMs + 30_000,
        text: item.text,
      };
    });
  }

  const words = transcript.split(/\s+/).filter(Boolean);
  const approxWordsPer30s = 75;
  const windows: Array<{ startMs: number; endMs: number; text: string }> = [];

  let startWord = 0;
  let windowIndex = 0;
  while (startWord < words.length) {
    const endWord = Math.min(words.length, startWord + approxWordsPer30s);
    const text = cleanTranscriptText(words.slice(startWord, endWord).join(" "));
    if (text) {
      windows.push({
        startMs: windowIndex * 30_000,
        endMs: windowIndex * 30_000 + 30_000,
        text,
      });
    }
    startWord = endWord;
    windowIndex += 1;
  }

  return windows;
};

export const buildVideoResource = (params: {
  source: string;
  title?: string;
  transcript: string;
  transcriptSegments?: TranscriptSegment[];
  keyframes?: Array<{
    timestampMs: number;
    imageBase64?: string;
    imageMimeType?: string;
    labels?: string[];
    ocrText?: string;
    caption?: string;
  }>;
  transcriptionMode?: string;
  transcriptionError?: string;
}): CanonicalResource => {
  const segments = splitTranscriptByTime(
    params.transcript,
    params.transcriptSegments
  );
  const keyframes = params.keyframes ?? [];

  const chunks: CanonicalChunk[] = [
    {
      chunkIndex: 0,
      content: [
        `Video source: ${params.source}`,
        params.title ? `Title: ${sanitizeLooseText(params.title)}` : "",
        `Transcription mode: ${params.transcriptionMode ?? "unknown"}`,
      ]
        .filter(Boolean)
        .join("\n"),
      kind: "visualization",
      metadata: {
        sourceType: "video",
        source: params.source,
        modality: "text",
        extra: {
          section: "video-metadata",
        },
      },
    },
  ];
  for (const segment of segments) {
    const nearbyFrames = keyframes.filter(
      (frame) =>
        frame.timestampMs >= segment.startMs &&
        frame.timestampMs <= segment.endMs
    );

    const frameContext = nearbyFrames
      .map((frame) => {
        const cleanedLabels = frame.labels
          ?.map((label) => sanitizeLooseText(label))
          .filter(Boolean);
        const labels = cleanedLabels?.length
          ? `labels: ${cleanedLabels.join(", ")}`
          : "";
        const ocrText = frame.ocrText
          ? `ocr: ${sanitizeLooseText(frame.ocrText)}`
          : "";
        const caption = frame.caption
          ? `caption: ${sanitizeLooseText(frame.caption)}`
          : "";
        return [labels, ocrText, caption].filter(Boolean).join(" | ");
      })
      .filter(Boolean)
      .join("\n");

    const multimodal = [segment.text, frameContext]
      .filter(Boolean)
      .join("\n\n");
    const segmentChunks = semanticChunkText({
      text: multimodal,
      sourceType: "video",
      source: params.source,
      startMs: segment.startMs,
      endMs: segment.endMs,
      baseMetadata: {
        section: "video-transcript",
        modality: "mixed",
        keyframeCount: nearbyFrames.length,
      },
    });

    chunks.push(...segmentChunks);
  }

  for (const [index, frame] of keyframes.entries()) {
    if (!frame.imageBase64) {
      continue;
    }

    const windowStart = Math.max(0, frame.timestampMs - 15_000);
    const windowEnd = frame.timestampMs + 15_000;
    const nearbyTranscript = segments
      .filter(
        (segment) =>
          segment.startMs <= windowEnd && segment.endMs >= windowStart
      )
      .map((segment) => segment.text)
      .join(" ")
      .trim();
    const cleanedLabels = frame.labels
      ?.map((label) => sanitizeLooseText(label))
      .filter(Boolean);

    const contextText = [
      params.title
        ? `Video: ${sanitizeLooseText(params.title)}`
        : "Video frame",
      `Timestamp: ${Math.floor(frame.timestampMs / 1000)}s`,
      frame.caption ? `Caption: ${sanitizeLooseText(frame.caption)}` : "",
      cleanedLabels?.length ? `Labels: ${cleanedLabels.join(", ")}` : "",
      frame.ocrText ? `OCR: ${sanitizeLooseText(frame.ocrText)}` : "",
      nearbyTranscript
        ? `Nearby transcript: ${sanitizeLooseText(nearbyTranscript)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    chunks.push({
      chunkIndex: chunks.length,
      content: contextText,
      kind: "visualization",
      embeddingInput: {
        type: "multimodal",
        content: [
          { type: "text", text: contextText },
          {
            type: "image_base64",
            image_base64: frame.imageBase64,
            mimeType: frame.imageMimeType || "image/jpeg",
          },
        ],
      },
      metadata: {
        sourceType: "video",
        source: params.source,
        startMs: frame.timestampMs,
        endMs: frame.timestampMs,
        modality: "mixed",
        extra: {
          section: "video-keyframe",
          keyframeIndex: index,
        },
      },
    });
  }

  chunks.forEach((chunk, index) => {
    chunk.chunkIndex = index;
  });

  return {
    sourceType: "video",
    source: params.source,
    title: params.title,
    metadata: {
      hasTranscript: segments.length > 0 || params.transcript.trim().length > 0,
      segmentCount: segments.length,
      keyframeCount: keyframes.length,
      transcriptionModel: params.transcriptionMode,
      transcriptionError: params.transcriptionError,
    },
    chunks,
  };
};

export const isLowQualityTranscript = (text: string): boolean => {
  const cleaned = cleanTranscriptText(text);
  if (!cleaned) {
    return true;
  }

  const words = cleaned.toLowerCase().split(/\s+/).filter(Boolean);

  if (words.length < 8) {
    return true;
  }

  if (words.length >= 120) {
    return false;
  }

  const numericCount = words.filter((word) => /^\d+$/.test(word)).length;
  const shortCount = words.filter((word) => word.length <= 2).length;
  const uniqueRatio = new Set(words).size / words.length;

  return (
    numericCount / words.length > 0.22 ||
    shortCount / words.length > 0.55 ||
    uniqueRatio < 0.28
  );
};

export const isDirectMediaUrl = (url: string): boolean =>
  /\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|m4a|aac|ogg|flac)(\?|#|$)/i.test(url);

export const canFallbackToLinkExtraction = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    if (!/^https?:$/.test(parsed.protocol)) {
      return false;
    }
    return !isDirectMediaUrl(parsed.pathname);
  } catch {
    return false;
  }
};

interface ResolvedVideoMediaSource {
  bytes: Uint8Array;
  extension: string;
}

interface RemoteByteResponse {
  arrayBuffer: () => Promise<ArrayBuffer>;
  body: {
    getReader: () => {
      read: () => Promise<{ done: boolean; value?: Uint8Array }>;
      releaseLock: () => void;
    };
  } | null;
  headers: {
    get: (name: string) => string | null;
  };
}

const getVideoExtensionFromUrl = (url: URL) => {
  const match = url.pathname.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "mp4";
};

const readResponseBytesWithLimit = async (
  response: RemoteByteResponse,
  maxBytes: number
): Promise<Uint8Array> => {
  const contentLength = response.headers.get("content-length");
  if (contentLength) {
    assertMaxSize("Remote video", Number(contentLength), maxBytes);
  }

  if (!response.body) {
    const bytes = new Uint8Array(await response.arrayBuffer());
    assertMaxSize("Remote video", bytes.byteLength, maxBytes);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }

      totalBytes += value.byteLength;
      assertMaxSize("Remote video", totalBytes, maxBytes);
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const resolveVideoMediaSource = async (
  url: string
): Promise<ResolvedVideoMediaSource> => {
  const providerExtracted = await extractFromSupportedProvider(url);
  const targetMedia = providerExtracted?.mediaUrls.find((mediaUrl) =>
    /\.(mp4|mov|mkv|webm)(\?|$)/i.test(mediaUrl)
  );
  const resolvedUrl = await assertResolvedRemoteUrlIsSafe(targetMedia ?? url);
  const response = await safeRemoteFetch(resolvedUrl.toString(), {
    headers: {
      accept: "video/*,audio/*,*/*;q=0.8",
    },
    timeoutMs: config.remoteFetchTimeoutMs,
  });
  if (!response.ok) {
    throw new Error(
      `Failed to fetch video media (${response.status}) from ${resolvedUrl.hostname}`
    );
  }

  return {
    bytes: await readResponseBytesWithLimit(
      response,
      config.remoteVideoMaxBytes
    ),
    extension: getVideoExtensionFromUrl(resolvedUrl),
  };
};

const transcribeFromResolvedMedia = async (
  mediaSource: ResolvedVideoMediaSource
): Promise<{ text: string; segments: TranscriptSegment[] }> => {
  const audioBytes = await extractAudioFromVideoFile(
    mediaSource.bytes,
    mediaSource.extension
  );
  return transcribeAudio(audioBytes);
};

const transcribeSegments = async (
  segments: Array<{ bytes: Uint8Array; offsetMs: number }>
): Promise<{ text: string; segments: TranscriptSegment[]; error?: string }> => {
  const allSegments: TranscriptSegment[] = [];
  const textParts: string[] = [];
  const errors: string[] = [];

  for (const [index, segment] of segments.entries()) {
    try {
      const result = await transcribeAudio(segment.bytes);
      if (result.text.trim()) {
        textParts.push(result.text.trim());
      }
      for (const cue of result.segments) {
        allSegments.push({
          startMs: cue.startMs + segment.offsetMs,
          endMs: cue.endMs + segment.offsetMs,
          text: cue.text,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      errors.push(`segment ${index + 1}: ${message}`);
    }
  }

  return {
    text: textParts.join(" ").trim(),
    segments: allSegments,
    error: errors.length > 0 ? errors.join("; ") : undefined,
  };
};

const transcribeFromResolvedMediaWithFallback = async (
  mediaSource: ResolvedVideoMediaSource
): Promise<{ text: string; segments: TranscriptSegment[]; error?: string }> => {
  try {
    return await transcribeFromResolvedMedia(mediaSource);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const segmented = await extractAudioSegmentsFromVideoFile(
      mediaSource.bytes,
      mediaSource.extension
    );
    const result = await transcribeSegments(
      segmented.map((segment) => ({
        bytes: segment.bytes,
        offsetMs: segment.startMs,
      }))
    );
    return {
      ...result,
      error: result.error ? `${message}; ${result.error}` : message,
    };
  }
};

const extractKeyframesFromResolvedMedia = async (
  mediaSource: ResolvedVideoMediaSource
): Promise<Array<{ timestampMs: number; imageBase64: string }>> => {
  const keyframes = await extractKeyframesFromVideoFile(
    mediaSource.bytes,
    mediaSource.extension
  );
  return keyframes.map((frame) => ({
    timestampMs: frame.timestampMs,
    imageBase64: frame.imageBase64,
  }));
};

export const ingestVideo = async (input: {
  source?: string;
  url?: string;
  transcript?: string;
  transcriptSegments?: TranscriptSegment[];
  title?: string;
  keyframes?: Array<{
    timestampMs: number;
    imageBase64?: string;
    labels?: string[];
    ocrText?: string;
    caption?: string;
  }>;
}): Promise<CanonicalResource> => {
  const normalizedUrl = input.url?.trim();
  const source =
    input.source?.trim() ||
    normalizedUrl ||
    `video:inline:${crypto.randomUUID()}`;
  const startedAtMs = Date.now();
  if (normalizedUrl) {
    assertSafeUrl(normalizedUrl);
  }

  let transcript = input.transcript?.trim() ?? "";
  let transcriptSegments: TranscriptSegment[] = input.transcriptSegments ?? [];
  let keyframes = input.keyframes;
  let transcriptionError: string | undefined;

  if (normalizedUrl && (!(transcript && keyframes) || keyframes.length === 0)) {
    const resolveStartedAt = Date.now();
    const mediaSource = await resolveVideoMediaSource(normalizedUrl);
    logVideoStageTiming({
      stage: "resolve-media-source",
      durationMs: Date.now() - resolveStartedAt,
      source,
    });
    const shouldTranscribe = !transcript;
    const shouldExtractKeyframes = !keyframes || keyframes.length === 0;
    const transcriptionPromise = shouldTranscribe
      ? (() => {
          const transcribeStartedAt = Date.now();
          return transcribeFromResolvedMediaWithFallback(mediaSource).finally(
            () => {
              logVideoStageTiming({
                stage: "transcribe-audio",
                durationMs: Date.now() - transcribeStartedAt,
                source,
              });
            }
          );
        })()
      : undefined;
    const keyframePromise = shouldExtractKeyframes
      ? (() => {
          const keyframesStartedAt = Date.now();
          return extractKeyframesFromResolvedMedia(mediaSource).finally(() => {
            logVideoStageTiming({
              stage: "extract-keyframes",
              durationMs: Date.now() - keyframesStartedAt,
              source,
            });
          });
        })()
      : undefined;

    const [transcriptionResult, keyframeResult] = await Promise.all([
      transcriptionPromise
        ? transcriptionPromise.then(
            (value) => ({ ok: true as const, value }),
            (_error: unknown) => ({ ok: false as const })
          )
        : Promise.resolve(null),
      keyframePromise
        ? keyframePromise.then(
            (value) => ({ ok: true as const, value }),
            (_error: unknown) => ({ ok: false as const })
          )
        : Promise.resolve(null),
    ]);

    if (transcriptionResult?.ok) {
      const transcription = transcriptionResult.value;
      transcript = transcription.text.trim();
      const segmentText = transcription.segments
        .map((segment) => segment.text)
        .join(" ")
        .trim();
      transcriptSegments = isLowQualityTranscript(segmentText)
        ? []
        : transcription.segments;
      transcriptionError = transcription.error;
    } else if (shouldTranscribe) {
      if (canFallbackToLinkExtraction(normalizedUrl)) {
        const link = await ingestLink(normalizedUrl);
        transcript = link.chunks.map((chunk) => chunk.content).join("\n\n");
      } else {
        transcript = "";
        transcriptSegments = [];
      }
    }

    if (keyframeResult?.ok) {
      keyframes = keyframeResult.value;
    } else if (shouldExtractKeyframes) {
      // Keyframes are optional for successful ingestion if transcript exists.
      keyframes = [];
    }
  } else if ((!keyframes || keyframes.length === 0) && normalizedUrl) {
    try {
      const mediaSource = await resolveVideoMediaSource(normalizedUrl);
      keyframes = await extractKeyframesFromResolvedMedia(mediaSource);
    } catch {
      keyframes = [];
    }
  }

  if (isLowQualityTranscript(transcript)) {
    transcript = "";
    transcriptSegments = [];
  }

  if (!transcript && (!keyframes || keyframes.length === 0)) {
    throw new Error(
      "Video ingestion requires transcript or extractable keyframes from the provided URL."
    );
  }

  const buildStartedAt = Date.now();
  const built = buildVideoResource({
    source,
    title: input.title,
    transcript,
    transcriptSegments,
    keyframes,
    transcriptionMode: input.transcript
      ? "provided"
      : `groq:${config.groqTranscriptionModel}`,
    transcriptionError,
  });
  logVideoStageTiming({
    stage: "build-resource",
    durationMs: Date.now() - buildStartedAt,
    source,
  });
  logVideoStageTiming({
    stage: "total-video-ingest",
    durationMs: Date.now() - startedAtMs,
    source,
  });

  return built;
};

export const ingestVideoFile = async (input: {
  filename: string;
  bytes: Uint8Array;
  title?: string;
}): Promise<CanonicalResource> => {
  const extension = input.filename.split(".").pop() ?? "mp4";
  const [audioSegments, extractedKeyframes] = await Promise.all([
    extractAudioSegmentsFromVideoFile(input.bytes, extension),
    extractKeyframesFromVideoFile(input.bytes, extension),
  ]);

  let transcription: {
    text: string;
    segments: TranscriptSegment[];
    error?: string;
  } = {
    text: "",
    segments: [],
  };
  if (audioSegments.length === 1) {
    try {
      const single = await transcribeAudio(audioSegments[0].bytes);
      transcription = single;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      transcription = { text: "", segments: [], error: message };
    }
  } else if (audioSegments.length > 1) {
    transcription = await transcribeSegments(
      audioSegments.map((segment) => ({
        bytes: segment.bytes,
        offsetMs: segment.startMs,
      }))
    );
  }

  const transcriptText = transcription.text.trim();
  const useTranscript = !isLowQualityTranscript(transcriptText);
  const segmentText = transcription.segments
    .map((segment) => segment.text)
    .join(" ")
    .trim();
  const useSegments = !isLowQualityTranscript(segmentText);

  return buildVideoResource({
    source: `video:file:${input.filename}`,
    title: input.title,
    transcript: useTranscript ? transcriptText : "",
    transcriptSegments: useSegments ? transcription.segments : [],
    keyframes: extractedKeyframes.map((frame: ExtractedVideoKeyframe) => ({
      timestampMs: frame.timestampMs,
      imageBase64: frame.imageBase64,
    })),
    transcriptionMode: `groq:${config.groqTranscriptionModel}`,
    transcriptionError: transcription.error,
  });
};
