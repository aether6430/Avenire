import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { db, fileAsset, ingestionResource } from "@avenire/database";
import { getStorageUrl } from "@avenire/storage";
import { and, asc, eq, exists, inArray, isNull, or } from "drizzle-orm";
import { Effect, Schema } from "effect-v4";
import { BenchmarkArtifact, BenchmarkCorpusManifest } from "./domain";
import { BenchmarkFileSystem } from "./integrity";

export class DatabaseCorpusImportError extends Schema.TaggedErrorClass<DatabaseCorpusImportError>()(
  "DatabaseCorpusImportError",
  {
    fileId: Schema.optional(Schema.String),
    message: Schema.String,
    cause: Schema.Defect(),
  }
) {}

const IMPORTED_MIME_TYPES = ["application/pdf", "video/mp4"] as const;

function artifactIdentity(input: {
  id: string;
  mimeType: string | null;
  name: string;
}) {
  if (input.mimeType === "application/pdf") {
    return {
      format: "pdf-native" as const,
      mimeType: "application/pdf",
      path: `local/files/${input.id}.pdf`,
      sourceType: "pdf" as const,
    };
  }
  if (input.mimeType === "video/mp4") {
    return {
      format: "mp4" as const,
      mimeType: "video/mp4",
      path: `local/files/${input.id}.mp4`,
      sourceType: "video" as const,
    };
  }
  throw new Error(`Unsupported database benchmark file: ${input.name}`);
}

const listDatabaseCorpusFiles = Effect.tryPromise({
  try: () => {
    const ingestedResource = db
      .select({ id: ingestionResource.id })
      .from(ingestionResource)
      .where(
        or(
          eq(ingestionResource.fileId, fileAsset.id),
          eq(ingestionResource.title, fileAsset.name)
        )
      )
      .limit(1);
    return db
      .select({
        id: fileAsset.id,
        mimeType: fileAsset.mimeType,
        name: fileAsset.name,
        sizeBytes: fileAsset.sizeBytes,
        storageKey: fileAsset.storageKey,
      })
      .from(fileAsset)
      .where(
        and(
          isNull(fileAsset.deletedAt),
          inArray(fileAsset.mimeType, [...IMPORTED_MIME_TYPES]),
          exists(ingestedResource)
        )
      )
      .orderBy(asc(fileAsset.mimeType), asc(fileAsset.name));
  },
  catch: (cause) =>
    DatabaseCorpusImportError.make({
      message: "Unable to list benchmark files from the configured database",
      cause,
    }),
});

function downloadDatabaseFile(input: {
  id: string;
  name: string;
  storageKey: string;
}) {
  return Effect.tryPromise({
    try: async () => {
      const url = await getStorageUrl(input.storageKey);
      if (!url) {
        throw new Error("Storage did not return a download URL");
      }
      const response = await fetch(url, {
        headers: { "user-agent": "AvenireRetrievalBenchmark/0.1" },
        redirect: "follow",
      });
      if (!response.ok) {
        throw new Error(`Storage download failed with HTTP ${response.status}`);
      }
      return new Uint8Array(await response.arrayBuffer());
    },
    catch: (cause) =>
      DatabaseCorpusImportError.make({
        fileId: input.id,
        message: `Unable to download ${input.name}`,
        cause,
      }),
  });
}

export const importDatabaseCorpus = Effect.fn("benchmark.importDatabaseCorpus")(
  function* (dataRoot: string) {
    const fileSystem = yield* BenchmarkFileSystem;
    const files = yield* listDatabaseCorpusFiles;
    let downloaded = 0;
    let reused = 0;
    let totalBytes = 0;
    const skipped: Array<{ fileId: string; name: string; reason: string }> = [];

    const importedArtifacts = yield* Effect.forEach(
      files,
      (file) =>
        Effect.gen(function* () {
          const identity = artifactIdentity(file);
          const artifactPath = resolve(dataRoot, identity.path);
          const existing = yield* fileSystem.readOptionalBytes(artifactPath);
          let bytes: Uint8Array;
          if (existing !== null && existing.byteLength === file.sizeBytes) {
            reused += 1;
            bytes = existing;
          } else {
            const downloadedBytes = yield* downloadDatabaseFile(file);
            if (downloadedBytes.byteLength !== file.sizeBytes) {
              return yield* Effect.fail(
                DatabaseCorpusImportError.make({
                  fileId: file.id,
                  message: `${file.name}: expected ${file.sizeBytes} bytes but downloaded ${downloadedBytes.byteLength}`,
                  cause: new Error("Database file size mismatch"),
                })
              );
            }
            yield* fileSystem.writeBytesAtomic(artifactPath, downloadedBytes);
            downloaded += 1;
            bytes = downloadedBytes;
          }
          totalBytes += bytes.byteLength;
          return new BenchmarkArtifact({
            id: `database-file-${file.id}`,
            title: file.name,
            domain: "database-reference-corpus",
            sourceType: identity.sourceType,
            format: identity.format,
            path: identity.path,
            mimeType: identity.mimeType,
            byteSize: bytes.byteLength,
            sha256: createHash("sha256").update(bytes).digest("hex"),
            license: "PRIVATE-BENCHMARK",
            licenseUrl: "https://avenire.local/benchmark-only",
            creator: "Imported from the configured Avenire workspace",
            attribution: file.name,
            redistribution: "manifest-only",
          });
        }).pipe(
          Effect.catchTag("DatabaseCorpusImportError", (error) => {
            skipped.push({
              fileId: file.id,
              name: file.name,
              reason: error.message,
            });
            return Effect.succeed(null);
          })
        ),
      { concurrency: 2 }
    );
    const artifacts = importedArtifacts.filter(
      (artifact): artifact is BenchmarkArtifact => artifact !== null
    );

    const manifest = new BenchmarkCorpusManifest({
      schemaVersion: 1,
      corpusId: "avenire-database-supplement",
      version: "local-snapshot-1",
      artifacts,
    });
    yield* fileSystem.writeBytesAtomic(
      resolve(dataRoot, "local/manifest.json"),
      new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`)
    );

    return {
      artifactCount: artifacts.length,
      downloaded,
      reused,
      skipped,
      totalBytes,
    };
  }
);
