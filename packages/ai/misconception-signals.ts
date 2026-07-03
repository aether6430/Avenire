import { generateText } from "ai";
import { APOLLO_INGESTION_COHERE_EMBED_MODEL, apollo } from "./models";
import type { PromptMemoryBlock } from "./prompts/chat";

const COHERE_EMBED_URL = "https://api.cohere.com/v2/embed";
const DEFAULT_EMBEDDING_DIMENSIONS = 1024;
const MAX_PREFILTER_CANDIDATES = 4;
const MIN_COSINE_SIMILARITY = 0.5;
const CLASSIFIER_MIN_COSINE_SIMILARITY = 0.62;
const MAX_DETECTOR_TEXT_CHARS = 2000;
const MAX_MISCONCEPTION_TEXT_CHARS = 1200;
const EMBEDDING_CACHE_TTL_MS = 1000 * 60 * 60 * 6;

type CohereEmbedInputType = "search_document" | "search_query";

export interface MisconceptionSignalRecord {
  concept: string;
  confidence: number;
  id: string;
  reason: string;
  subject: string;
  topic: string;
  updatedAt: string;
}

export interface RankedMisconceptionSignal {
  misconception: MisconceptionSignalRecord;
  score: number;
}

export interface MisconceptionSignalResult {
  candidates: RankedMisconceptionSignal[];
  interventionBlock: PromptMemoryBlock | null;
  matched: boolean;
}

export interface MisconceptionSignalDetectorOptions {
  classifier?: (input: {
    abortSignal?: AbortSignal;
    latestUserText: string;
    ranked: RankedMisconceptionSignal[];
  }) => Promise<{ matched: boolean; reason: string | null }>;
  embedTexts?: (input: {
    abortSignal?: AbortSignal;
    inputType: CohereEmbedInputType;
    texts: string[];
  }) => Promise<number[][]>;
  now?: () => number;
  providerTimeoutMs?: number | null;
}

interface CachedEmbedding {
  expiresAtMs: number;
  value: number[];
}

const misconceptionEmbeddingCache = new Map<string, CachedEmbedding>();

export function clearMisconceptionSignalEmbeddingCache() {
  misconceptionEmbeddingCache.clear();
}

function normalizeDetectorText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function createDetectorAbortSignal(input: {
  parent?: AbortSignal;
  timeoutMs: number | null;
}) {
  if (!input.parent && typeof input.timeoutMs !== "number") {
    return {
      signal: undefined,
      cleanup: () => {},
    };
  }

  const controller = new AbortController();
  const timeout =
    typeof input.timeoutMs === "number"
      ? setTimeout(() => {
          controller.abort();
        }, input.timeoutMs)
      : null;
  const abort = () => controller.abort();
  input.parent?.addEventListener("abort", abort, { once: true });

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeout) {
        clearTimeout(timeout);
      }
      input.parent?.removeEventListener("abort", abort);
    },
  };
}

function getEmbeddingDimensions() {
  const parsed = Number.parseInt(
    process.env.COHERE_EMBEDDING_DIMENSIONS ?? "",
    10
  );
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_EMBEDDING_DIMENSIONS;
}

function hashText(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 33) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(16);
}

export function buildMisconceptionSignalText(
  record: MisconceptionSignalRecord
) {
  return normalizeDetectorText(
    [
      `Subject: ${record.subject}`,
      `Topic: ${record.topic}`,
      `Concept: ${record.concept}`,
      `Known misconception: ${record.reason}`,
    ].join("\n")
  ).slice(0, MAX_MISCONCEPTION_TEXT_CHARS);
}

function buildMisconceptionEmbeddingCacheKey(
  record: MisconceptionSignalRecord
) {
  return [
    "misconception-embedding",
    APOLLO_INGESTION_COHERE_EMBED_MODEL,
    record.id,
    record.updatedAt,
    hashText(buildMisconceptionSignalText(record)),
  ].join(":");
}

function readCachedEmbedding(key: string, now: number) {
  const cached = misconceptionEmbeddingCache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAtMs <= now) {
    misconceptionEmbeddingCache.delete(key);
    return null;
  }
  return cached.value;
}

function writeCachedEmbedding(key: string, value: number[], now: number) {
  misconceptionEmbeddingCache.set(key, {
    expiresAtMs: now + EMBEDDING_CACHE_TTL_MS,
    value,
  });
}

function extractEmbeddingsFromResponse(json: unknown): number[][] {
  const value = json as {
    embeddings?: number[][] | { float?: number[][] };
  };

  if (Array.isArray(value.embeddings) && Array.isArray(value.embeddings[0])) {
    return value.embeddings as number[][];
  }

  if (
    value.embeddings &&
    !Array.isArray(value.embeddings) &&
    Array.isArray(value.embeddings.float)
  ) {
    return value.embeddings.float;
  }

  return [];
}

export async function embedMisconceptionSignalTexts(input: {
  abortSignal?: AbortSignal;
  apiKey?: string;
  inputType: CohereEmbedInputType;
  texts: string[];
}) {
  if (input.texts.length === 0) {
    return [];
  }

  const apiKey = input.apiKey?.trim() ?? process.env.COHERE_API_KEY?.trim();
  if (!apiKey) {
    return [];
  }

  const response = await fetch(COHERE_EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: APOLLO_INGESTION_COHERE_EMBED_MODEL,
      input_type: input.inputType,
      embedding_types: ["float"],
      output_dimension: getEmbeddingDimensions(),
      inputs: input.texts.map((text) => ({
        content: [{ type: "text", text }],
      })),
    }),
    signal: input.abortSignal,
  });

  if (!response.ok) {
    throw new Error(`Cohere embeddings request failed (${response.status})`);
  }

  const embeddings = extractEmbeddingsFromResponse(await response.json());
  if (embeddings.length !== input.texts.length) {
    throw new Error(
      `Cohere embeddings length mismatch: expected ${input.texts.length}, received ${embeddings.length}.`
    );
  }
  return embeddings;
}

async function getMisconceptionEmbeddings(input: {
  abortSignal?: AbortSignal;
  embedTexts: NonNullable<MisconceptionSignalDetectorOptions["embedTexts"]>;
  misconceptions: MisconceptionSignalRecord[];
  now: number;
}) {
  const keys = input.misconceptions.map(buildMisconceptionEmbeddingCacheKey);
  const embeddings = new Map<string, number[]>();
  const missing: Array<{ index: number; key: string; text: string }> = [];

  keys.forEach((key, index) => {
    const cached = readCachedEmbedding(key, input.now);
    if (cached) {
      embeddings.set(key, cached);
      return;
    }

    const misconception = input.misconceptions[index];
    if (!misconception) {
      return;
    }

    missing.push({
      index,
      key,
      text: buildMisconceptionSignalText(misconception),
    });
  });

  if (missing.length > 0) {
    const nextEmbeddings = await input.embedTexts({
      abortSignal: input.abortSignal,
      inputType: "search_document",
      texts: missing.map((entry) => entry.text),
    });
    nextEmbeddings.forEach((embedding, index) => {
      const entry = missing[index];
      if (!entry) {
        return;
      }
      writeCachedEmbedding(entry.key, embedding, input.now);
      embeddings.set(entry.key, embedding);
    });
  }

  return keys.map((key) => embeddings.get(key) ?? []);
}

export function cosineSimilarity(left: number[], right: number[]) {
  if (left.length === 0 || left.length !== right.length) {
    return 0;
  }

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) {
    return 0;
  }

  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function buildInterventionBlock(input: {
  classifierReason: string | null;
  ranked: RankedMisconceptionSignal[];
  subject: string | null;
  topic: string | null;
}): PromptMemoryBlock {
  const lines = input.ranked.map(
    ({ misconception, score }, index) =>
      `${index + 1}. ${misconception.concept} [${misconception.subject} / ${misconception.topic}] - ${misconception.reason} (similarity ${score.toFixed(2)}, confidence ${misconception.confidence.toFixed(2)})`
  );

  return {
    content: [
      "Current-turn misconception signal:",
      ...lines,
      input.classifierReason
        ? `Classifier note: ${input.classifierReason}`
        : null,
      "Use this only as private current-turn guidance. If relevant, directly correct the likely wrong mental model in the answer. Do not say a detector ran, and do not persist this signal as evidence.",
    ]
      .filter(Boolean)
      .join("\n"),
    freshness: "current",
    kind: "misconception",
    scope: {
      subject: input.subject,
      topic: input.topic,
    },
  };
}

export async function classifyMisconceptionSignalMatch(input: {
  abortSignal?: AbortSignal;
  latestUserText: string;
  ranked: RankedMisconceptionSignal[];
}) {
  const strongest = input.ranked[0];
  if (!strongest || strongest.score < CLASSIFIER_MIN_COSINE_SIMILARITY) {
    return {
      matched: false,
      reason: null,
    };
  }

  const { text } = await generateText({
    model: apollo.languageModel("apollo-meta"),
    prompt: [
      "Decide whether the user's current message is likely re-entering one of the known misconceptions.",
      'Return only JSON with this shape: {"match":true|false,"reason":"short private reason"}.',
      "Be conservative. Normal curiosity or a related topic is not enough.",
      `User message: ${input.latestUserText}`,
      "Known misconceptions:",
      ...input.ranked.map(
        ({ misconception, score }, index) =>
          `${index + 1}. ${misconception.concept}: ${misconception.reason} (cosine ${score.toFixed(3)})`
      ),
    ].join("\n"),
    maxOutputTokens: 90,
    temperature: 0,
    abortSignal: input.abortSignal,
  });

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    return {
      matched: false,
      reason: null,
    };
  }

  try {
    const parsed = JSON.parse(match[0]) as {
      match?: unknown;
      reason?: unknown;
    };
    return {
      matched: parsed.match === true,
      reason:
        typeof parsed.reason === "string"
          ? normalizeDetectorText(parsed.reason).slice(0, 240)
          : null,
    };
  } catch {
    return {
      matched: false,
      reason: null,
    };
  }
}

export async function detectMisconceptionSignals(input: {
  abortSignal?: AbortSignal;
  latestUserText: string;
  misconceptions: MisconceptionSignalRecord[];
  subject: string | null;
  topic: string | null;
  options?: MisconceptionSignalDetectorOptions;
}): Promise<MisconceptionSignalResult | null> {
  const latestUserText = normalizeDetectorText(input.latestUserText).slice(
    0,
    MAX_DETECTOR_TEXT_CHARS
  );
  if (!latestUserText || input.misconceptions.length === 0) {
    return null;
  }

  const options = input.options ?? {};
  const embedTexts = options.embedTexts ?? embedMisconceptionSignalTexts;
  const classifier = options.classifier ?? classifyMisconceptionSignalMatch;
  const now = options.now?.() ?? Date.now();
  const detectorAbort = createDetectorAbortSignal({
    parent: input.abortSignal,
    timeoutMs: options.providerTimeoutMs ?? null,
  });

  try {
    const [queryEmbeddings, misconceptionEmbeddings] = await Promise.all([
      embedTexts({
        abortSignal: detectorAbort.signal,
        inputType: "search_query",
        texts: [latestUserText],
      }),
      getMisconceptionEmbeddings({
        abortSignal: detectorAbort.signal,
        embedTexts,
        misconceptions: input.misconceptions,
        now,
      }),
    ]);
    const queryEmbedding = queryEmbeddings[0];
    if (!queryEmbedding) {
      return null;
    }

    const ranked = input.misconceptions
      .map((misconception, index) => ({
        misconception,
        score: cosineSimilarity(
          queryEmbedding,
          misconceptionEmbeddings[index] ?? []
        ),
      }))
      .filter((candidate) => candidate.score >= MIN_COSINE_SIMILARITY)
      .sort((left, right) => right.score - left.score)
      .slice(0, MAX_PREFILTER_CANDIDATES);

    if (ranked.length === 0) {
      return {
        candidates: [],
        interventionBlock: null,
        matched: false,
      };
    }

    const classification = await classifier({
      abortSignal: detectorAbort.signal,
      latestUserText,
      ranked,
    });
    if (!classification.matched) {
      return {
        candidates: ranked,
        interventionBlock: null,
        matched: false,
      };
    }

    return {
      candidates: ranked,
      interventionBlock: buildInterventionBlock({
        classifierReason: classification.reason,
        ranked,
        subject: input.subject,
        topic: input.topic,
      }),
      matched: true,
    };
  } finally {
    detectorAbort.cleanup();
  }
}
