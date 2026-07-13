import { meter } from "@avenire/observability";
import type { RetrievalDecisionTelemetry } from "./retrieve";

type RetrievalCacheOutcome = "hit" | "miss" | "slow_probe_bypassed";
type RetrievalMode = "auto" | "fast" | "full";
type RetrievalOrigin = "api" | "chat" | "unknown";
type RetrievalPath = "fast" | "slow" | "unknown";
type RetrievalProvider = "apollo" | "cohere";
type RetrievalProviderOperation =
  | "embedding"
  | "hyde"
  | "query_expansion"
  | "rerank"
  | "rerank_fallback";
type RetrievalProviderOutcome = "cancelled" | "error" | "success";
type RetrievalSourceType =
  | "audio"
  | "document"
  | "image"
  | "link"
  | "markdown"
  | "pdf"
  | "video";

function boundedRatio(numerator: number, denominator: number) {
  if (denominator <= 0) {
    return 0;
  }

  return Number(Math.min(1, Math.max(0, numerator / denominator)).toFixed(3));
}

function providerOutcome(error: unknown): RetrievalProviderOutcome {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "cancelled";
  }

  if (
    error instanceof Error &&
    (error.name === "AbortError" || /abort/i.test(error.message))
  ) {
    return "cancelled";
  }

  return "error";
}

export function recordRetrievalCacheTelemetry(input: {
  cacheLookupMs: number;
  mode: RetrievalMode;
  origin: RetrievalOrigin;
  outcome: RetrievalCacheOutcome;
  path?: RetrievalPath;
  sourceType?: RetrievalSourceType;
}) {
  void meter({
    eventName: "retrieval.cache.lookup",
    payload: {
      cacheLookupMs: input.cacheLookupMs,
      mode: input.mode,
      origin: input.origin,
      outcome: input.outcome,
      path: input.path ?? "unknown",
      sourceType: input.sourceType ?? "unknown",
    },
  });
}

export function recordRetrievalQualityTelemetry(input: {
  decision: RetrievalDecisionTelemetry;
  path: "fast" | "slow";
}) {
  const candidateDenominator = Math.min(
    input.decision.candidateCount,
    input.decision.rerankCandidateCount || input.decision.candidateCount
  );

  void meter({
    eventName: "retrieval.quality.proxy",
    payload: {
      ambiguityCount: input.decision.ambiguityReasons.length,
      candidateCount: input.decision.candidateCount,
      citationQualityProxy: Number(
        Math.min(1, Math.max(0, input.decision.topRerankScore)).toFixed(3)
      ),
      confidenceProxy: input.decision.confidenceScore,
      contextTruncated: input.decision.contextTruncated,
      path: input.path,
      recallProxy: boundedRatio(
        input.decision.resultCount,
        candidateDenominator
      ),
      rerankFallbackUsed: input.decision.rerankFallbackUsed,
      resultCount: input.decision.resultCount,
      sourceType: input.decision.queryShape.sourceType ?? "unknown",
    },
  });
}

export async function observeRetrievalProviderCall<T>(input: {
  operation: RetrievalProviderOperation;
  provider: RetrievalProvider;
  run: () => Promise<T>;
}): Promise<T> {
  const startedAt = performance.now();

  try {
    const result = await input.run();
    void meter({
      eventName: "retrieval.provider.call",
      payload: {
        callCount: 1,
        latencyMs: Math.round(performance.now() - startedAt),
        operation: input.operation,
        outcome: "success",
        provider: input.provider,
      },
    });
    return result;
  } catch (error) {
    void meter({
      eventName: "retrieval.provider.call",
      payload: {
        callCount: 1,
        latencyMs: Math.round(performance.now() - startedAt),
        operation: input.operation,
        outcome: providerOutcome(error),
        provider: input.provider,
      },
    });
    throw error;
  }
}
