import { Context, Effect, Schema } from "effect-v4";
import type { BenchmarkDataset, BenchmarkQuery } from "./domain";
import type { TraceSnapshot } from "./evaluate-trace";
import { BenchmarkRun, type RunMaterializedEvidence } from "./run-contract";

export class BenchmarkRetrievalError extends Schema.TaggedErrorClass<BenchmarkRetrievalError>()(
  "BenchmarkRetrievalError",
  { message: Schema.String, cause: Schema.Defect() }
) {}

export interface BenchmarkRetrievalInput {
  readonly query: BenchmarkQuery;
  readonly trace: (snapshot: TraceSnapshot) => void;
}

export class BenchmarkRetriever extends Context.Service<
  BenchmarkRetriever,
  {
    readonly retrieve: (
      input: BenchmarkRetrievalInput
    ) => Effect.Effect<void, BenchmarkRetrievalError>;
  }
>()("BenchmarkRetriever") {}

export interface BenchmarkRunMetadata {
  readonly configurationId: string;
  readonly corpusId: string;
  readonly corpusVersion: string;
  readonly createdAt: string;
  readonly embeddingModelId: string;
  readonly gitSha: string;
  readonly modelId: string;
  readonly rerankerModelId: string;
  readonly runId: string;
}

export const executeBenchmarkRun = Effect.fn("benchmark.executeRun")(
  function* (input: {
    readonly dataset: BenchmarkDataset;
    readonly materializedEvidence: readonly RunMaterializedEvidence[];
    readonly metadata: BenchmarkRunMetadata;
    readonly split?: "development" | "test";
  }) {
    const retriever = yield* BenchmarkRetriever;
    const failures: Array<{
      phase: "retrieval";
      message: string;
      queryId: string;
    }> = [];
    const queries = input.split
      ? input.dataset.queries.filter((query) => query.split === input.split)
      : input.dataset.queries;
    const traces = yield* Effect.forEach(
      queries,
      (query) =>
        Effect.gen(function* () {
          const snapshots: TraceSnapshot[] = [];
          const startedAt = yield* Effect.sync(() => performance.now());
          yield* retriever
            .retrieve({
              query,
              trace: (snapshot) => snapshots.push(snapshot),
            })
            .pipe(
              Effect.catchTag("BenchmarkRetrievalError", (error) =>
                Effect.sync(() => {
                  failures.push({
                    phase: "retrieval",
                    message: error.message,
                    queryId: query.id,
                  });
                })
              )
            );
          const durationMs = yield* Effect.sync(() =>
            Math.max(0, Math.round(performance.now() - startedAt))
          );
          return { durationMs, queryId: query.id, snapshots };
        }),
      { concurrency: 1 }
    );

    return new BenchmarkRun({
      schemaVersion: 1,
      ...input.metadata,
      failures,
      materializedEvidence: [...input.materializedEvidence],
      traces,
    });
  }
);
