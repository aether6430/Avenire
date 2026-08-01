import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { Effect, Schedule, Schema } from "effect-v4";
import {
  BenchmarkDataError,
  BenchmarkFileSystem,
  type BenchmarkReadError,
  loadBenchmarkContracts,
} from "./integrity";

export class BenchmarkFetchError extends Schema.TaggedErrorClass<BenchmarkFetchError>()(
  "BenchmarkFetchError",
  {
    artifactId: Schema.String,
    cause: Schema.Defect(),
    message: Schema.String,
    url: Schema.String,
  }
) {}

export interface FetchSummary {
  readonly downloaded: number;
  readonly reused: number;
  readonly totalExternal: number;
}

const DOWNLOAD_RETRY_SCHEDULE = Schedule.max([
  Schedule.exponential("250 millis"),
  Schedule.recurs(4),
]);

function executeFfmpeg(args: readonly string[]) {
  return new Promise<void>((resolve, reject) => {
    execFile("ffmpeg", [...args], (error) =>
      error ? reject(error) : resolve()
    );
  });
}

async function writeMediaClip(input: {
  artifactId: string;
  artifactPath: string;
  bytes: Uint8Array;
  endMs: number;
  format: string;
  serialOffset?: number;
  startMs: number;
}) {
  const sourcePath = `${input.artifactPath}.upstream.partial`;
  const outputPath = `${input.artifactPath}.partial`;
  try {
    await mkdir(dirname(input.artifactPath), { recursive: true });
    await writeFile(sourcePath, input.bytes);
    const isAudio = input.format === "ogg";
    const args = [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      String(input.startMs / 1000),
      "-t",
      String((input.endMs - input.startMs) / 1000),
      "-i",
      sourcePath,
      "-map",
      "0",
      "-c",
      "copy",
      "-map_metadata",
      "-1",
      "-fflags",
      "+bitexact",
      ...(isAudio
        ? [
            "-flags:a",
            "+bitexact",
            "-serial_offset",
            String(input.serialOffset ?? 0),
          ]
        : ["-flags:v", "+bitexact", "-flags:a", "+bitexact"]),
      "-f",
      input.format,
      outputPath,
    ];
    await executeFfmpeg(args);
    const output = await readFile(outputPath);
    return new Uint8Array(output);
  } finally {
    await Promise.all([
      unlink(sourcePath).catch(() => undefined),
      unlink(outputPath).catch(() => undefined),
    ]);
  }
}

function verifyBytes(input: {
  artifactId: string;
  bytes: Uint8Array;
  expectedByteSize: number;
  expectedSha256: string;
  path: string;
}) {
  if (input.bytes.byteLength !== input.expectedByteSize) {
    return BenchmarkDataError.make({
      path: input.path,
      message: `${input.artifactId}: expected ${input.expectedByteSize} bytes but received ${input.bytes.byteLength}`,
    });
  }
  const digest = createHash("sha256").update(input.bytes).digest("hex");
  return digest === input.expectedSha256
    ? null
    : BenchmarkDataError.make({
        path: input.path,
        message: `${input.artifactId}: SHA-256 mismatch; expected ${input.expectedSha256}, received ${digest}`,
      });
}

export const fetchBenchmarkSources = Effect.fn("benchmark.fetchSources")(
  function* (
    dataRoot: string
  ): Effect.fn.Return<
    FetchSummary,
    BenchmarkDataError | BenchmarkFetchError | BenchmarkReadError,
    BenchmarkFileSystem
  > {
    const fileSystem = yield* BenchmarkFileSystem;
    const { manifest } = yield* loadBenchmarkContracts(dataRoot);
    const externalArtifacts = manifest.artifacts.filter(
      (artifact) => artifact.downloadUrl !== undefined
    );
    let downloaded = 0;
    let reused = 0;
    const downloadedSources = new Map<string, Uint8Array>();
    const normalizedRoot = resolve(dataRoot);

    yield* Effect.forEach(externalArtifacts, (artifact) => {
      const artifactPath = resolve(normalizedRoot, artifact.path);
      if (!artifactPath.startsWith(`${normalizedRoot}${sep}`)) {
        return Effect.fail(
          BenchmarkDataError.make({
            path: artifactPath,
            message: "Artifact path escapes the benchmark data root",
          })
        );
      }
      return fileSystem.readOptionalBytes(artifactPath).pipe(
        Effect.flatMap((existing) => {
          if (existing) {
            const issue = verifyBytes({
              artifactId: artifact.id,
              bytes: existing,
              expectedByteSize: artifact.byteSize,
              expectedSha256: artifact.sha256,
              path: artifactPath,
            });
            if (!issue) {
              reused += 1;
              return Effect.void;
            }
          }

          const downloadUrl = artifact.downloadUrl;
          if (!downloadUrl) {
            return Effect.fail(
              BenchmarkDataError.make({
                path: artifactPath,
                message: `${artifact.id}: missing download URL`,
              })
            );
          }
          return Effect.tryPromise({
            try: async () => {
              const cached = downloadedSources.get(downloadUrl);
              if (cached) {
                return cached;
              }
              const response = await fetch(downloadUrl, {
                headers: { "user-agent": "AvenireRetrievalBenchmark/0.1" },
                redirect: "follow",
              });
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
              }
              const bytes = new Uint8Array(await response.arrayBuffer());
              downloadedSources.set(downloadUrl, bytes);
              return bytes;
            },
            catch: (cause) =>
              BenchmarkFetchError.make({
                artifactId: artifact.id,
                cause,
                message: `Unable to download ${artifact.id}`,
                url: downloadUrl,
              }),
          }).pipe(
            Effect.retry(DOWNLOAD_RETRY_SCHEDULE),
            Effect.flatMap(
              (
                bytes
              ): Effect.Effect<
                void,
                BenchmarkDataError | BenchmarkFetchError | BenchmarkReadError
              > => {
                const issue = verifyBytes({
                  artifactId: artifact.id,
                  bytes,
                  expectedByteSize:
                    artifact.upstreamByteSize ?? artifact.byteSize,
                  expectedSha256: artifact.upstreamSha256 ?? artifact.sha256,
                  path: artifactPath,
                });
                if (issue) {
                  return Effect.fail(issue);
                }
                downloaded += 1;
                const derivation = artifact.derivation;
                if (derivation?.kind === "media-clip") {
                  return Effect.tryPromise({
                    try: () =>
                      writeMediaClip({
                        artifactId: artifact.id,
                        artifactPath,
                        bytes,
                        endMs: derivation.endMs,
                        format: artifact.format,
                        serialOffset: derivation.serialOffset,
                        startMs: derivation.startMs,
                      }),
                    catch: (cause) =>
                      BenchmarkFetchError.make({
                        artifactId: artifact.id,
                        cause,
                        message: `Unable to derive media clip for ${artifact.id}`,
                        url: downloadUrl,
                      }),
                  }).pipe(
                    Effect.flatMap(
                      (
                        output
                      ): Effect.Effect<
                        void,
                        BenchmarkDataError | BenchmarkReadError
                      > => {
                        const outputIssue = verifyBytes({
                          artifactId: artifact.id,
                          bytes: output,
                          expectedByteSize: artifact.byteSize,
                          expectedSha256: artifact.sha256,
                          path: artifactPath,
                        });
                        return outputIssue
                          ? Effect.fail(outputIssue)
                          : fileSystem.writeBytesAtomic(artifactPath, output);
                      }
                    )
                  );
                }
                return fileSystem.writeBytesAtomic(artifactPath, bytes);
              }
            )
          );
        })
      );
    });

    return {
      downloaded,
      reused,
      totalExternal: externalArtifacts.length,
    };
  }
);
