import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  db,
  fileAsset,
  ingestionChunk,
  ingestionResource,
} from "@avenire/database";
import {
  PostgresVectorStore,
  retrieveRelevantChunks,
} from "@avenire/ingestion";
import { eq } from "drizzle-orm";
import { Effect, Layer, Schema } from "effect-v4";
import { BenchmarkDataset } from "../domain";
import {
  BenchmarkFileSystem,
  BenchmarkFileSystemLive,
  loadBenchmarkContracts,
} from "../integrity";
import {
  type MaterializationCandidate,
  materializeEvidence,
} from "../materialize-qrels";
import { buildBenchmarkReport } from "../report";
import {
  BenchmarkRetrievalError,
  BenchmarkRetriever,
  executeBenchmarkRun,
} from "../runner";

const execFileAsync = promisify(execFile);
const dataRoot = resolve(import.meta.dirname, "../../data");
const queryPrefix = "q-db-";
const scopeArgumentIndex = process.argv.indexOf("--scope");
const scope =
  scopeArgumentIndex >= 0 &&
  process.argv[scopeArgumentIndex + 1] === "controlled"
    ? "controlled"
    : "database";
const queryExpansionEnabled =
  (process.env.RETRIEVAL_QUERY_EXPANSION_ENABLED ?? "true").toLowerCase() !==
  "false";
const hydeEnabled =
  (process.env.RETRIEVAL_HYDE_ENABLED ?? "true").toLowerCase() !== "false";

class DatabaseBenchmarkError extends Schema.TaggedErrorClass<DatabaseBenchmarkError>()(
  "DatabaseBenchmarkError",
  { message: Schema.String, cause: Schema.Defect() }
) {}

const readDatabaseCandidates = Effect.tryPromise({
  try: () =>
    db
      .select({
        chunkId: ingestionChunk.id,
        content: ingestionChunk.content,
        endMs: ingestionChunk.endMs,
        fileId: ingestionResource.fileId,
        fileMetadata: fileAsset.metadata,
        fileName: fileAsset.name,
        metadata: ingestionChunk.metadata,
        page: ingestionChunk.page,
        resourceTitle: ingestionResource.title,
        startMs: ingestionChunk.startMs,
        workspaceId: ingestionResource.workspaceId,
      })
      .from(ingestionChunk)
      .innerJoin(
        ingestionResource,
        eq(ingestionChunk.resourceId, ingestionResource.id)
      )
      .leftJoin(fileAsset, eq(ingestionResource.fileId, fileAsset.id)),
  catch: (cause) =>
    DatabaseBenchmarkError.make({
      message: "Unable to load materialization candidates from the database",
      cause,
    }),
});

const gitSha = Effect.tryPromise({
  try: async () =>
    (
      await execFileAsync("git", ["rev-parse", "--short=12", "HEAD"])
    ).stdout.trim(),
  catch: (cause) =>
    DatabaseBenchmarkError.make({
      message: "Unable to resolve the benchmark git SHA",
      cause,
    }),
});

const metadataNumber = (
  metadata: Record<string, unknown>,
  key: "sheet" | "slide"
) => {
  const value = metadata[key];
  return typeof value === "number" && Number.isInteger(value) ? value : null;
};

const metadataString = (
  metadata: Record<string, unknown>,
  key: "sheet" | "sheetName"
) => {
  const value = metadata[key];
  return typeof value === "string" ? value : null;
};

const benchmarkArtifactId = (metadata: Record<string, unknown> | null) => {
  const value = metadata?.benchmarkArtifactId;
  return typeof value === "string" && value.trim() ? value : null;
};

const benchmarkCorpusVersion = (metadata: Record<string, unknown> | null) => {
  const value = metadata?.benchmarkCorpusVersion;
  return typeof value === "string" && value.trim() ? value : null;
};

const program = Effect.gen(function* () {
  const fileSystem = yield* BenchmarkFileSystem;
  const { dataset, manifest } = yield* loadBenchmarkContracts(dataRoot);
  const localQueries = dataset.queries.filter((query) =>
    scope === "controlled"
      ? !query.id.startsWith(queryPrefix)
      : query.id.startsWith(queryPrefix)
  );
  const localQueryIds = new Set(localQueries.map((query) => query.id));
  const localEvidenceIds = new Set(
    localQueries.flatMap((query) => query.requiredEvidenceGroups.flat())
  );
  const localDataset = new BenchmarkDataset({
    schemaVersion: 1,
    version: dataset.version,
    evidence: dataset.evidence.filter((evidence) =>
      localEvidenceIds.has(evidence.id)
    ),
    queries: localQueries,
    judgments: dataset.judgments.filter((judgment) =>
      localQueryIds.has(judgment.queryId)
    ),
  });
  if (localDataset.queries.length === 0) {
    return yield* Effect.fail(
      DatabaseBenchmarkError.make({
        message: "No local database benchmark queries were found",
        cause: new Error(
          "Run corpus:import-db and add data/local/dataset.json"
        ),
      })
    );
  }

  const localArtifacts = manifest.artifacts.filter((artifact) =>
    scope === "controlled"
      ? !artifact.id.startsWith("database-file-")
      : artifact.id.startsWith("database-file-")
  );
  const localArtifactIds = new Set(
    localArtifacts.map((artifact) => artifact.id)
  );
  const artifactByFileId = new Map(
    localArtifacts.map((artifact) => [
      artifact.id.slice("database-file-".length),
      artifact.id,
    ])
  );
  const artifactByTitle = new Map(
    localArtifacts.map((artifact) => [artifact.title, artifact.id])
  );
  const rows = yield* readDatabaseCandidates;
  const mappedRows = rows.flatMap((row) => {
    if (
      scope === "controlled" &&
      benchmarkCorpusVersion(row.fileMetadata) !== manifest.version
    ) {
      return [];
    }
    const artifactId =
      scope === "controlled"
        ? benchmarkArtifactId(row.fileMetadata)
        : ((row.fileId ? artifactByFileId.get(row.fileId) : undefined) ??
          (row.resourceTitle
            ? artifactByTitle.get(row.resourceTitle)
            : undefined) ??
          (row.fileName ? artifactByTitle.get(row.fileName) : undefined));
    if (artifactId && !localArtifactIds.has(artifactId)) {
      return [];
    }
    return artifactId ? [{ ...row, artifactId }] : [];
  });
  const workspaceIds = Array.from(
    new Set(mappedRows.map((row) => row.workspaceId))
  );
  if (workspaceIds.length !== 1) {
    return yield* Effect.fail(
      DatabaseBenchmarkError.make({
        message: `Expected one benchmark workspace but found ${workspaceIds.length}`,
        cause: new Error(
          "Database benchmark resources span zero or multiple workspaces"
        ),
      })
    );
  }
  const workspaceId = workspaceIds[0];
  if (!workspaceId) {
    return yield* Effect.fail(
      DatabaseBenchmarkError.make({
        message: "The benchmark workspace ID is unavailable",
        cause: new Error("No materialization candidates were mapped"),
      })
    );
  }

  const candidates: MaterializationCandidate[] = mappedRows.map((row) => ({
    artifactId: row.artifactId,
    chunkId: row.chunkId,
    content: row.content,
    endMs: row.endMs,
    page: row.page,
    sheet:
      metadataString(row.metadata, "sheet") ??
      metadataString(row.metadata, "sheetName"),
    slide: metadataNumber(row.metadata, "slide"),
    startMs: row.startMs,
  }));
  const materializedEvidence = materializeEvidence(
    localDataset.evidence.map((evidence) => ({
      artifactId: evidence.artifactId,
      evidenceId: evidence.id,
      locator: evidence.locator,
    })),
    candidates
  );

  const vectorStore = new PostgresVectorStore(workspaceId);
  const RetrieverLive = Layer.succeed(BenchmarkRetriever)({
    retrieve: ({ query, trace }) =>
      Effect.tryPromise({
        try: () =>
          retrieveRelevantChunks(vectorStore, query.text, {
            limit: 10,
            sourceType: query.sourceType,
            trace: (snapshot) =>
              trace({
                candidates: snapshot.candidates.map((candidate) => ({
                  chunkId: candidate.chunkId,
                  score:
                    candidate.rerankScore ??
                    candidate.fusionScore ??
                    candidate.score,
                })),
                path: snapshot.path,
                queryKind: snapshot.queryKind,
                stage: snapshot.stage,
              }),
            workspaceId,
          }),
        catch: (cause) =>
          BenchmarkRetrievalError.make({
            message: cause instanceof Error ? cause.message : String(cause),
            cause,
          }),
      }).pipe(Effect.asVoid),
  });
  const createdAt = new Date().toISOString();
  const runId = `${scope}-${createdAt.replaceAll(/[:.]/g, "-")}`;
  const sha = yield* gitSha;
  const run = yield* executeBenchmarkRun({
    dataset: localDataset,
    materializedEvidence,
    metadata: {
      configurationId: `production-preserved-adaptive-rerank-20-80-limit-10-abstain-0.18-${scope}`,
      corpusId: manifest.corpusId,
      corpusVersion: manifest.version,
      createdAt,
      embeddingModelId: "cohere/embed-v4.0",
      gitSha: sha,
      modelId: queryExpansionEnabled
        ? hydeEnabled
          ? "gemini-2.5-flash-lite-query-expansion-and-hyde"
          : "gemini-2.5-flash-lite-query-expansion"
        : "deterministic-query-decomposition",
      rerankerModelId: "cohere/rerank-v3.5",
      runId,
    },
  }).pipe(Effect.provide(RetrieverLive));
  const report = buildBenchmarkReport({ dataset: localDataset, manifest, run });
  const outputRoot =
    scope === "controlled"
      ? resolve(dataRoot, ".cache/runs", runId)
      : resolve(dataRoot, "local/runs", runId);
  const runPath = resolve(outputRoot, "run.json");
  const reportPath = resolve(outputRoot, "report.json");
  yield* fileSystem.writeBytesAtomic(
    runPath,
    new TextEncoder().encode(`${JSON.stringify(run, null, 2)}\n`)
  );
  yield* fileSystem.writeBytesAtomic(
    reportPath,
    new TextEncoder().encode(`${JSON.stringify(report, null, 2)}\n`)
  );
  yield* Effect.sync(() =>
    process.stdout.write(
      `${JSON.stringify(
        {
          failureCount: run.failures.length,
          materializedEvidenceCount: materializedEvidence.filter(
            (evidence) => evidence.chunkIds.length > 0
          ).length,
          queryCount: localDataset.queries.length,
          reportPath,
          runPath,
          scope,
          workspaceId,
        },
        null,
        2
      )}\n`
    )
  );
});

program
  .pipe(Effect.provide(BenchmarkFileSystemLive), Effect.runPromise)
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
