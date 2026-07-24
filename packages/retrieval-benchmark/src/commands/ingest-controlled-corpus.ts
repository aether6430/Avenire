import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, resolve } from "node:path";
import {
  createWorkspaceForUser,
  createWorkspaceNoteFile,
  db,
  fileAsset,
  ingestionChunk,
  ingestionEmbedding,
  ingestionResource,
  listWorkspacesForUser,
  registerFileAsset,
  user,
} from "@avenire/database";
import { ingestStoredFile } from "@avenire/ingestion";
import { uploadStorageFile } from "@avenire/storage";
import { eq, sql } from "drizzle-orm";
import { Effect, Schema } from "effect-v4";
import { BenchmarkFileSystemLive, loadBenchmarkContracts } from "../integrity";

const dataRoot = resolve(import.meta.dirname, "../../data");
const defaultWorkspaceName = "Avenire Retrieval Benchmark 0.3";

const percentile = (values: readonly number[], fraction: number) => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((left, right) => left - right);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ??
    0
  );
};

class ControlledIngestionError extends Schema.TaggedErrorClass<ControlledIngestionError>()(
  "ControlledIngestionError",
  { message: Schema.String, cause: Schema.Defect() }
) {}

const argumentValue = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};

const getBenchmarkArtifactId = (metadata: Record<string, unknown>) => {
  const value = metadata.benchmarkArtifactId;
  return typeof value === "string" && value.trim() ? value : null;
};

const program = Effect.gen(function* () {
  const userEmail = argumentValue("--user-email")?.trim();
  if (!userEmail) {
    return yield* Effect.fail(
      ControlledIngestionError.make({
        message: "Pass --user-email <existing Avenire user email>",
        cause: new Error("Missing benchmark owner"),
      })
    );
  }
  const workspaceName =
    argumentValue("--workspace-name")?.trim() || defaultWorkspaceName;
  const forceArtifactPrefix = argumentValue("--force-artifact-prefix")?.trim();
  const [owner] = yield* Effect.tryPromise({
    try: () =>
      db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, userEmail))
        .limit(1),
    catch: (cause) =>
      ControlledIngestionError.make({
        message: `Unable to find benchmark owner ${userEmail}`,
        cause,
      }),
  });
  if (!owner) {
    return yield* Effect.fail(
      ControlledIngestionError.make({
        message: `No Avenire user exists for ${userEmail}`,
        cause: new Error("Unknown benchmark owner"),
      })
    );
  }

  const workspace = yield* Effect.tryPromise({
    try: async () => {
      const existing = (await listWorkspacesForUser(owner.id)).find(
        (candidate) => candidate.name === workspaceName
      );
      return existing ?? createWorkspaceForUser(owner.id, workspaceName);
    },
    catch: (cause) =>
      ControlledIngestionError.make({
        message: `Unable to resolve benchmark workspace ${workspaceName}`,
        cause,
      }),
  });
  const { manifest } = yield* loadBenchmarkContracts(dataRoot);
  const artifacts = manifest.artifacts.filter(
    (artifact) => !artifact.id.startsWith("database-file-")
  );
  const preflight = {
    artifactCount: artifacts.length,
    totalBytes: artifacts.reduce(
      (total, artifact) => total + artifact.byteSize,
      0
    ),
    largestArtifacts: [...artifacts]
      .sort((left, right) => right.byteSize - left.byteSize)
      .slice(0, 5)
      .map((artifact) => ({ id: artifact.id, byteSize: artifact.byteSize })),
  };
  const existingFiles = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          id: fileAsset.id,
          metadata: fileAsset.metadata,
          mimeType: fileAsset.mimeType,
          name: fileAsset.name,
          storageKey: fileAsset.storageKey,
          storageUrl: fileAsset.storageUrl,
        })
        .from(fileAsset)
        .where(eq(fileAsset.workspaceId, workspace.workspaceId)),
    catch: (cause) =>
      ControlledIngestionError.make({
        message: "Unable to inspect existing benchmark files",
        cause,
      }),
  });
  const existingResources = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          chunkCount: sql<number>`count(distinct ${ingestionChunk.id})`,
          embeddingCount: sql<number>`count(${ingestionEmbedding.id})`,
          fileId: ingestionResource.fileId,
        })
        .from(ingestionResource)
        .leftJoin(
          ingestionChunk,
          eq(ingestionChunk.resourceId, ingestionResource.id)
        )
        .leftJoin(
          ingestionEmbedding,
          eq(ingestionEmbedding.chunkId, ingestionChunk.id)
        )
        .where(eq(ingestionResource.workspaceId, workspace.workspaceId))
        .groupBy(ingestionResource.id, ingestionResource.fileId),
    catch: (cause) =>
      ControlledIngestionError.make({
        message: "Unable to inspect existing benchmark resources",
        cause,
      }),
  });
  const fileByArtifactId = new Map(
    existingFiles.flatMap((file) => {
      const artifactId = getBenchmarkArtifactId(file.metadata);
      return artifactId ? [[artifactId, file] as const] : [];
    })
  );
  const ingestedFileIds = new Set(
    existingResources.flatMap((resource) =>
      resource.fileId &&
      Number(resource.chunkCount) > 0 &&
      Number(resource.chunkCount) === Number(resource.embeddingCount)
        ? [resource.fileId]
        : []
    )
  );
  let created = 0;
  let ingested = 0;
  let reused = 0;

  for (const [index, artifact] of artifacts.entries()) {
    const artifactPath = resolve(dataRoot, artifact.path);
    let file = fileByArtifactId.get(artifact.id);
    const forceArtifact =
      forceArtifactPrefix !== undefined &&
      artifact.id.startsWith(forceArtifactPrefix);
    if (file && forceArtifact) {
      const fileId = file.id;
      yield* Effect.tryPromise({
        try: () =>
          db
            .delete(ingestionResource)
            .where(eq(ingestionResource.fileId, fileId)),
        catch: (cause) =>
          ControlledIngestionError.make({
            message: `Unable to reset forced artifact ${artifact.id}`,
            cause,
          }),
      });
    }
    if (file && ingestedFileIds.has(file.id) && !forceArtifact) {
      reused += 1;
      yield* Effect.sync(() =>
        process.stdout.write(
          `[${index + 1}/${artifacts.length}] reuse ${artifact.id}\n`
        )
      );
      continue;
    }

    const bytes = yield* Effect.tryPromise({
      try: () => readFile(artifactPath),
      catch: (cause) =>
        ControlledIngestionError.make({
          message: `Unable to read ${artifactPath}`,
          cause,
        }),
    });
    if (!file) {
      yield* Effect.sync(() =>
        process.stdout.write(
          `[${index + 1}/${artifacts.length}] register ${artifact.id}\n`
        )
      );
      if (artifact.sourceType === "markdown") {
        const note = yield* Effect.tryPromise({
          try: () =>
            createWorkspaceNoteFile({
              content: bytes.toString("utf8"),
              folderId: workspace.rootFolderId,
              metadata: {
                benchmarkArtifactId: artifact.id,
                benchmarkCorpusId: manifest.corpusId,
                benchmarkCorpusVersion: manifest.version,
              },
              name: basename(artifact.path),
              userId: owner.id,
              workspaceId: workspace.workspaceId,
            }),
          catch: (cause) =>
            ControlledIngestionError.make({
              message: `Unable to register note ${artifact.id}`,
              cause,
            }),
        });
        file = {
          id: note.id,
          metadata: note.metadata ?? {},
          mimeType: note.mimeType,
          name: note.name,
          storageKey: note.storageKey,
          storageUrl: note.storageUrl,
        };
      } else {
        const uploaded = yield* Effect.tryPromise({
          try: () =>
            uploadStorageFile({
              body: bytes,
              contentType: artifact.mimeType,
              name: basename(artifact.path),
            }),
          catch: (cause) =>
            ControlledIngestionError.make({
              message: `Unable to upload ${artifact.id}`,
              cause,
            }),
        });
        const registered = yield* Effect.tryPromise({
          try: () =>
            registerFileAsset(workspace.workspaceId, owner.id, {
              contentHashSha256: createHash("sha256")
                .update(bytes)
                .digest("hex"),
              folderId: workspace.rootFolderId,
              hashComputedBy: "server",
              hashVerificationStatus: "verified",
              metadata: {
                benchmarkArtifactId: artifact.id,
                benchmarkCorpusId: manifest.corpusId,
                benchmarkCorpusVersion: manifest.version,
              },
              mimeType: artifact.mimeType,
              name: basename(artifact.path),
              sizeBytes: bytes.byteLength,
              storageKey: uploaded.key,
              storageUrl: uploaded.url,
            }),
          catch: (cause) =>
            ControlledIngestionError.make({
              message: `Unable to register ${artifact.id}`,
              cause,
            }),
        });
        file = {
          id: registered.id,
          metadata: registered.metadata ?? {},
          mimeType: registered.mimeType,
          name: registered.name,
          storageKey: registered.storageKey,
          storageUrl: registered.storageUrl,
        };
      }
      created += 1;
      fileByArtifactId.set(artifact.id, file);
    }

    yield* Effect.sync(() =>
      process.stdout.write(
        `[${index + 1}/${artifacts.length}] ingest ${artifact.id}\n`
      )
    );
    const content =
      artifact.sourceType === "markdown" ? bytes.toString("utf8") : undefined;
    yield* Effect.tryPromise({
      try: () =>
        ingestStoredFile({
          content,
          fileId: file.id,
          fileName: file.name,
          metadata: file.metadata,
          mimeType: file.mimeType,
          sourceType: artifact.sourceType,
          storageKey: file.storageKey,
          storageUrl: file.storageUrl,
          workspaceId: workspace.workspaceId,
        }),
      catch: (cause) =>
        ControlledIngestionError.make({
          message: `Ingestion failed for ${artifact.id}: ${cause instanceof Error ? cause.message : String(cause)}`,
          cause,
        }),
    });
    ingested += 1;
  }

  const finalResources = yield* Effect.tryPromise({
    try: () =>
      db
        .select({
          chunkCount: sql<number>`count(distinct ${ingestionChunk.id})`,
          fileId: ingestionResource.fileId,
        })
        .from(ingestionResource)
        .leftJoin(
          ingestionChunk,
          eq(ingestionChunk.resourceId, ingestionResource.id)
        )
        .where(eq(ingestionResource.workspaceId, workspace.workspaceId))
        .groupBy(ingestionResource.id, ingestionResource.fileId),
    catch: (cause) =>
      ControlledIngestionError.make({
        message: "Unable to compute final ingestion distribution",
        cause,
      }),
  });
  const chunkCounts = finalResources.map((resource) =>
    Number(resource.chunkCount)
  );

  return {
    artifactCount: artifacts.length,
    chunkDistribution: {
      max: Math.max(0, ...chunkCounts),
      p50: percentile(chunkCounts, 0.5),
      p95: percentile(chunkCounts, 0.95),
      resourceCount: chunkCounts.length,
      outlierCount: chunkCounts.filter(
        (count) => count > Math.max(1, percentile(chunkCounts, 0.95) * 5)
      ).length,
    },
    created,
    ingested,
    preflight,
    reused,
    workspaceId: workspace.workspaceId,
    workspaceName,
  };
});

program
  .pipe(Effect.provide(BenchmarkFileSystemLive), Effect.runPromise)
  .then((summary) => {
    process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  })
  .catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`
    );
    process.exitCode = 1;
  });
