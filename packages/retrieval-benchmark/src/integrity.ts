import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Context, Effect, Layer, Schema } from "effect-v4";
import { BenchmarkCorpusManifest, BenchmarkDataset } from "./domain";
import { BenchmarkRun } from "./run-contract";
import { type ValidationIssue, validateBenchmarkDataset } from "./validation";

export class BenchmarkReadError extends Schema.TaggedErrorClass<BenchmarkReadError>()(
  "BenchmarkReadError",
  { path: Schema.String, message: Schema.String, cause: Schema.Defect() }
) {}

export class BenchmarkDataError extends Schema.TaggedErrorClass<BenchmarkDataError>()(
  "BenchmarkDataError",
  { path: Schema.String, message: Schema.String }
) {}

export type BenchmarkIntegrityFailure = BenchmarkReadError | BenchmarkDataError;

export class BenchmarkFileSystem extends Context.Service<
  BenchmarkFileSystem,
  {
    readonly readBytes: (
      path: string
    ) => Effect.Effect<Uint8Array, BenchmarkReadError>;
    readonly readOptionalBytes: (
      path: string
    ) => Effect.Effect<Uint8Array | null, BenchmarkReadError>;
    readonly readText: (
      path: string
    ) => Effect.Effect<string, BenchmarkReadError>;
    readonly writeBytesAtomic: (
      path: string,
      bytes: Uint8Array
    ) => Effect.Effect<void, BenchmarkReadError>;
  }
>()("BenchmarkFileSystem") {}

const readFailure = (path: string, cause: unknown) =>
  BenchmarkReadError.make({
    path,
    message: `Unable to read benchmark file: ${path}`,
    cause,
  });

export const BenchmarkFileSystemLive = Layer.succeed(BenchmarkFileSystem)({
  readBytes: (path) =>
    Effect.tryPromise({
      try: () => readFile(path),
      catch: (cause) => readFailure(path, cause),
    }),
  readOptionalBytes: (path) =>
    Effect.tryPromise({
      try: () => readFile(path),
      catch: (cause) => readFailure(path, cause),
    }).pipe(
      Effect.catchTag("BenchmarkReadError", (error) =>
        error.cause instanceof Error &&
        "code" in error.cause &&
        error.cause.code === "ENOENT"
          ? Effect.succeed(null)
          : Effect.fail(error)
      )
    ),
  readText: (path) =>
    Effect.tryPromise({
      try: () => readFile(path, "utf8"),
      catch: (cause) => readFailure(path, cause),
    }),
  writeBytesAtomic: (path, bytes) =>
    Effect.tryPromise({
      try: async () => {
        await mkdir(dirname(path), { recursive: true });
        const temporaryPath = `${path}.partial`;
        await writeFile(temporaryPath, bytes);
        await rename(temporaryPath, path);
      },
      catch: (cause) => readFailure(path, cause),
    }),
});

const parseJson = (path: string, text: string) =>
  Effect.try({
    try: (): unknown => JSON.parse(text),
    catch: () =>
      BenchmarkDataError.make({ path, message: `Invalid JSON in ${path}` }),
  });

const decodeManifest = (path: string, value: unknown) =>
  Schema.decodeUnknownEffect(BenchmarkCorpusManifest)(value).pipe(
    Effect.mapError((error) =>
      BenchmarkDataError.make({ path, message: error.message })
    )
  );

const decodeDataset = (path: string, value: unknown) =>
  Schema.decodeUnknownEffect(BenchmarkDataset)(value).pipe(
    Effect.mapError((error) =>
      BenchmarkDataError.make({ path, message: error.message })
    )
  );

const decodeRun = (path: string, value: unknown) =>
  Schema.decodeUnknownEffect(BenchmarkRun)(value).pipe(
    Effect.mapError((error) =>
      BenchmarkDataError.make({ path, message: error.message })
    )
  );

const formatIssues = (issues: readonly ValidationIssue[]) =>
  issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");

export interface IntegritySummary {
  readonly artifactCount: number;
  readonly corpusId: string;
  readonly evidenceCount: number;
  readonly queryCount: number;
  readonly version: string;
}

export const loadBenchmarkContracts = Effect.fn("benchmark.loadContracts")(
  function* (dataRoot: string) {
    const fileSystem = yield* BenchmarkFileSystem;
    const manifestPath = resolve(dataRoot, "manifest.json");
    const datasetPath = resolve(dataRoot, "dataset.json");
    const manifest = yield* fileSystem.readText(manifestPath).pipe(
      Effect.flatMap((text) => parseJson(manifestPath, text)),
      Effect.flatMap((value) => decodeManifest(manifestPath, value))
    );
    const dataset = yield* fileSystem.readText(datasetPath).pipe(
      Effect.flatMap((text) => parseJson(datasetPath, text)),
      Effect.flatMap((value) => decodeDataset(datasetPath, value))
    );
    const localManifestPath = resolve(dataRoot, "local/manifest.json");
    const localDatasetPath = resolve(dataRoot, "local/dataset.json");
    const localManifest = yield* fileSystem
      .readOptionalBytes(localManifestPath)
      .pipe(
        Effect.flatMap((bytes) =>
          bytes === null
            ? Effect.succeed(null)
            : parseJson(
                localManifestPath,
                new TextDecoder().decode(bytes)
              ).pipe(
                Effect.flatMap((value) =>
                  decodeManifest(localManifestPath, value)
                )
              )
        )
      );
    const localDataset = yield* fileSystem
      .readOptionalBytes(localDatasetPath)
      .pipe(
        Effect.flatMap((bytes) =>
          bytes === null
            ? Effect.succeed(null)
            : parseJson(localDatasetPath, new TextDecoder().decode(bytes)).pipe(
                Effect.flatMap((value) =>
                  decodeDataset(localDatasetPath, value)
                )
              )
        )
      );
    return {
      dataset:
        localDataset === null
          ? dataset
          : new BenchmarkDataset({
              schemaVersion: 1,
              evidence: [...dataset.evidence, ...localDataset.evidence],
              queries: [...dataset.queries, ...localDataset.queries],
              judgments: [...dataset.judgments, ...localDataset.judgments],
            }),
      manifest:
        localManifest === null
          ? manifest
          : new BenchmarkCorpusManifest({
              schemaVersion: 1,
              corpusId: manifest.corpusId,
              version: manifest.version,
              artifacts: [...manifest.artifacts, ...localManifest.artifacts],
            }),
    };
  }
);

export const loadBenchmarkRun = Effect.fn("benchmark.loadRun")(function* (
  runPath: string
) {
  const fileSystem = yield* BenchmarkFileSystem;
  return yield* fileSystem.readText(runPath).pipe(
    Effect.flatMap((text) => parseJson(runPath, text)),
    Effect.flatMap((value) => decodeRun(runPath, value))
  );
});

export const validateBenchmarkIntegrity = Effect.fn(
  "benchmark.validateIntegrity"
)(function* (
  dataRoot: string
): Effect.fn.Return<
  IntegritySummary,
  BenchmarkIntegrityFailure,
  BenchmarkFileSystem
> {
  const fileSystem = yield* BenchmarkFileSystem;
  const datasetPath = resolve(dataRoot, "dataset.json");
  const { dataset, manifest } = yield* loadBenchmarkContracts(dataRoot);
  const issues = validateBenchmarkDataset(manifest, dataset);
  if (issues.length > 0) {
    return yield* Effect.fail(
      BenchmarkDataError.make({
        path: datasetPath,
        message: formatIssues(issues),
      })
    );
  }

  const normalizedRoot = resolve(dataRoot);
  yield* Effect.forEach(manifest.artifacts, (artifact) => {
    const artifactPath = resolve(normalizedRoot, artifact.path);
    if (!artifactPath.startsWith(`${normalizedRoot}${sep}`)) {
      return Effect.fail(
        BenchmarkDataError.make({
          path: artifactPath,
          message: "Artifact path escapes the benchmark data root",
        })
      );
    }
    return fileSystem.readBytes(artifactPath).pipe(
      Effect.flatMap((bytes) => {
        const digest = createHash("sha256").update(bytes).digest("hex");
        if (bytes.byteLength !== artifact.byteSize) {
          return Effect.fail(
            BenchmarkDataError.make({
              path: artifactPath,
              message: `Expected ${artifact.byteSize} bytes but found ${bytes.byteLength}`,
            })
          );
        }
        if (digest !== artifact.sha256) {
          return Effect.fail(
            BenchmarkDataError.make({
              path: artifactPath,
              message: `SHA-256 mismatch: expected ${artifact.sha256}, found ${digest}`,
            })
          );
        }
        return Effect.void;
      })
    );
  });

  return {
    artifactCount: manifest.artifacts.length,
    corpusId: manifest.corpusId,
    evidenceCount: dataset.evidence.length,
    queryCount: dataset.queries.length,
    version: manifest.version,
  };
});
