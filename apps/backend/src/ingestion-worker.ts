import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendIngestionJobEvent,
  beginIngestionJob,
  getFileForIngestion,
  listQueuedIngestionJobs,
  markIngestionJobFailed,
  markIngestionJobSucceeded,
  markNoteReindexed,
  replaceFileTranscriptCues,
  retryIngestionJob,
} from "@avenire/database";
import {
  assertRequiredSecrets,
  ingestStoredFile,
  warmWorkspace,
} from "@avenire/ingestion";
import {
  createIngestionQueueWorker,
  enqueueIngestionQueueJob,
  type IngestionQueueJobData,
} from "@avenire/ingestion/queue";
import {
  logInfo,
  reportError,
  safeError,
  scopedLogger,
  shutdownObservability,
} from "@avenire/observability";
import { serve } from "@hono/node-server";
import { config as loadEnv } from "dotenv";
import { Hono } from "hono";
import { publishWorkspaceStreamEvent } from "./workspace-event-stream";

// Prefer backend-local env; keep repo root as fallback.
const here = fileURLToPath(new URL(".", import.meta.url));
loadEnv({ path: resolve(here, "../.env") });
loadEnv({ path: resolve(here, "../../../.env"), override: false });

const port = Number.parseInt(
  process.env.PORT ?? process.env.INGESTION_WORKER_PORT ?? "3010",
  10
);
const workerConcurrency = Math.max(
  1,
  Number.parseInt(process.env.INGESTION_WORKER_CONCURRENCY ?? "3", 10)
);
const maxIngestionAttempts = Math.max(
  1,
  Number.parseInt(process.env.INGESTION_WORKER_MAX_ATTEMPTS ?? "3", 10)
);
const retryBaseMs = Math.max(
  250,
  Number.parseInt(process.env.INGESTION_WORKER_RETRY_BASE_MS ?? "1200", 10)
);
const retryMaxMs = Math.max(
  retryBaseMs,
  Number.parseInt(process.env.INGESTION_WORKER_RETRY_MAX_MS ?? "30000", 10)
);
const recoverySweepMs = Math.max(
  5000,
  Number.parseInt(process.env.INGESTION_WORKER_RECOVERY_SWEEP_MS ?? "15000", 10)
);

assertRequiredSecrets();

const app = new Hono();
const workerLogger = scopedLogger({
  feature: "ingestion",
  route: "ingestion-worker",
  service: "ingestion-worker",
});

let activeJobs = 0;
let lastError: string | null = null;
let lastJobDurationMs: number | null = null;
let lastRecoverySweepAt: string | null = null;
let lastRecoveredJobsCount = 0;

function isNonRetryableIngestionError(stage: string, error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    stage === "load-file" &&
    error.message === "File not found for ingestion job."
  );
}

async function publishIngestionEvent(input: {
  workspaceId: string;
  jobId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  await publishWorkspaceStreamEvent({
    workspaceUuid: input.workspaceId,
    type: "ingestion.job",
    payload: {
      createdAt: new Date().toISOString(),
      eventType: input.eventType,
      jobId: input.jobId,
      payload: input.payload ?? {},
      workspaceId: input.workspaceId,
    },
  });
}

async function appendAndPublishIngestionEvent(input: {
  workspaceId: string;
  jobId: string;
  eventType: string;
  payload?: Record<string, unknown>;
}) {
  await appendIngestionJobEvent({
    workspaceId: input.workspaceId,
    jobId: input.jobId,
    eventType: input.eventType,
    payload: input.payload,
  });
  await publishIngestionEvent(input);
}

async function processQueuedJob(queueJob: IngestionQueueJobData) {
  const job = await beginIngestionJob({
    workspaceId: queueJob.workspaceId,
    jobId: queueJob.jobId,
  });
  if (!job) {
    return;
  }

  const startedAtMs = Date.now();
  let stage = "fetch-file";
  activeJobs += 1;

  try {
    await publishIngestionEvent({
      workspaceId: job.workspaceId,
      jobId: job.id,
      eventType: "job.running",
      payload: {
        status: "running",
        attempts: job.attempts,
      },
    });

    await appendAndPublishIngestionEvent({
      workspaceId: job.workspaceId,
      jobId: job.id,
      eventType: "job.processing",
      payload: {
        status: "running",
        stage,
      },
    });

    stage = "load-file";
    const file = await getFileForIngestion(job.workspaceId, job.fileId);
    if (!file) {
      throw new Error("File not found for ingestion job.");
    }

    stage = "ingest";
    await appendAndPublishIngestionEvent({
      workspaceId: job.workspaceId,
      jobId: job.id,
      eventType: "job.processing",
      payload: {
        status: "running",
        stage: "ingest",
        fileId: file.id,
        name: file.name,
      },
    });

    const result = await ingestStoredFile({
      workspaceId: job.workspaceId,
      fileId: job.fileId,
      sourceType: job.sourceType,
      storageUrl: file.storageUrl,
      storageKey: file.storageKey,
      fileName: file.name,
      mimeType: file.mimeType,
      metadata: file.metadata,
      content: file.isNote ? (file.content ?? "") : null,
    });

    stage = "persist-transcript";
    await replaceFileTranscriptCues({
      workspaceId: job.workspaceId,
      fileId: job.fileId,
      cues: result.transcriptCues,
    });

    stage = "mark-success";
    const chunkCount = result.resources.reduce(
      (sum: number, item: { chunks: number }) => sum + item.chunks,
      0
    );

    await markIngestionJobSucceeded({
      workspaceId: job.workspaceId,
      jobId: job.id,
      payload: {
        resources: result.resources.length,
        chunks: chunkCount,
        fileId: job.fileId,
        durationMs: Date.now() - startedAtMs,
      },
    });
    await publishIngestionEvent({
      workspaceId: job.workspaceId,
      jobId: job.id,
      eventType: "job.succeeded",
      payload: {
        status: "succeeded",
        fileId: job.fileId,
        durationMs: Date.now() - startedAtMs,
      },
    });

    if (file.isNote) {
      await markNoteReindexed(file.id);
    }

    void warmWorkspace({
      chunkCount,
      fileId: job.fileId,
      jobId: job.id,
      resourceCount: result.resources.length,
      workspaceId: job.workspaceId,
    }).catch((error) => {
      void reportError({
        error,
        eventName: "ingestion.worker.retrieval_warmup_failed",
        context: {
          feature: "ingestion",
          service: "ingestion-worker",
          workspaceId: job.workspaceId,
        },
        payload: {
          fileId: job.fileId,
          jobId: job.id,
        },
      });
      console.warn("ingestion.worker.retrieval_warmup_failed", {
        error:
          error instanceof Error ? error.message : "Unknown warmup failure",
        jobId: job.id,
        workspaceId: job.workspaceId,
      });
    });

    lastError = null;
    lastJobDurationMs = Date.now() - startedAtMs;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown ingestion worker error.";
    const causeMessage =
      error instanceof Error &&
      error.cause instanceof Error &&
      error.cause.message
        ? error.cause.message
        : null;
    const enrichedMessage = causeMessage
      ? `[${stage}] ${message} | cause=${causeMessage}`
      : `[${stage}] ${message}`;
    lastError = enrichedMessage;

    await reportError({
      error,
      eventName: "ingestion.worker.job_failed",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
        workspaceId: job.workspaceId,
      },
      payload: {
        attempts: job.attempts,
        fileId: job.fileId,
        jobId: job.id,
        stage,
        causeMessage,
      },
    });
    console.error("ingestion.worker.job_failed", {
      workspaceId: job.workspaceId,
      jobId: job.id,
      fileId: job.fileId,
      stage,
      message,
      causeMessage,
      stack: error instanceof Error ? error.stack : undefined,
    });

    try {
      if (
        job.attempts < maxIngestionAttempts &&
        !isNonRetryableIngestionError(stage, error)
      ) {
        const retryInMs = Math.min(
          retryMaxMs,
          retryBaseMs * 2 ** Math.max(0, job.attempts - 1)
        );
        await retryIngestionJob({
          workspaceId: job.workspaceId,
          jobId: job.id,
          error: enrichedMessage,
          retryInMs,
        });
        await enqueueIngestionQueueJob({
          workspaceId: job.workspaceId,
          fileId: job.fileId,
          jobId: job.id,
          delayMs: retryInMs,
        });
        await publishIngestionEvent({
          workspaceId: job.workspaceId,
          jobId: job.id,
          eventType: "job.retry_scheduled",
          payload: {
            status: "queued",
            error: enrichedMessage,
            attempts: job.attempts,
            maxAttempts: maxIngestionAttempts,
            retryInMs,
          },
        });
      } else {
        await markIngestionJobFailed({
          workspaceId: job.workspaceId,
          jobId: job.id,
          error: enrichedMessage,
        });
        await publishIngestionEvent({
          workspaceId: job.workspaceId,
          jobId: job.id,
          eventType: "job.failed",
          payload: {
            status: "failed",
            error: enrichedMessage,
            attempts: job.attempts,
            maxAttempts: maxIngestionAttempts,
          },
        });
      }
    } catch (retryError) {
      const retryMessage =
        retryError instanceof Error
          ? `[retry-schedule] ${retryError.message}`
          : "[retry-schedule] Unknown BullMQ retry scheduling error.";

      await markIngestionJobFailed({
        workspaceId: job.workspaceId,
        jobId: job.id,
        error: `${enrichedMessage} | ${retryMessage}`,
      }).catch((markError) => {
        void reportError({
          error: markError,
          eventName: "ingestion.worker.retry_mark_failed_error",
          context: {
            feature: "ingestion",
            service: "ingestion-worker",
            workspaceId: job.workspaceId,
          },
          payload: {
            fileId: job.fileId,
            jobId: job.id,
          },
        });
        console.error("ingestion.worker.retry_mark_failed_error", markError);
      });

      await publishIngestionEvent({
        workspaceId: job.workspaceId,
        jobId: job.id,
        eventType: "job.failed",
        payload: {
          status: "failed",
          error: `${enrichedMessage} | ${retryMessage}`,
          attempts: job.attempts,
          maxAttempts: maxIngestionAttempts,
        },
      }).catch((publishError) => {
        void reportError({
          error: publishError,
          eventName: "ingestion.worker.retry_publish_failed_error",
          context: {
            feature: "ingestion",
            service: "ingestion-worker",
            workspaceId: job.workspaceId,
          },
          payload: {
            fileId: job.fileId,
            jobId: job.id,
          },
        });
        console.error(
          "ingestion.worker.retry_publish_failed_error",
          publishError
        );
      });

      await reportError({
        error: retryError,
        eventName: "ingestion.worker.retry_schedule_error",
        context: {
          feature: "ingestion",
          service: "ingestion-worker",
          workspaceId: job.workspaceId,
        },
        payload: {
          fileId: job.fileId,
          jobId: job.id,
        },
      });
      console.error("ingestion.worker.retry_schedule_error", retryError);
    }
  } finally {
    activeJobs = Math.max(0, activeJobs - 1);
  }
}

async function recoverQueuedJobs() {
  lastRecoverySweepAt = new Date().toISOString();

  try {
    const pageSize = 1000;
    let cursor: { createdAt: Date; id: string } | null = null;
    let recoveredJobsCount = 0;
    let rejectedCount = 0;

    while (true) {
      const queuedJobs = await listQueuedIngestionJobs({
        after: cursor,
        limit: pageSize,
      });

      if (queuedJobs.length === 0) {
        break;
      }

      recoveredJobsCount += queuedJobs.length;

      const results = await Promise.allSettled(
        queuedJobs.map((job) =>
          enqueueIngestionQueueJob({
            workspaceId: job.workspaceId,
            fileId: job.fileId,
            jobId: job.id,
          })
        )
      );

      rejectedCount += results.filter(
        (result) => result.status === "rejected"
      ).length;

      const lastJob = queuedJobs.at(-1);
      if (!lastJob) {
        break;
      }
      cursor = {
        createdAt: new Date(lastJob.createdAt),
        id: lastJob.id,
      };

      if (queuedJobs.length < pageSize) {
        break;
      }
    }

    lastRecoveredJobsCount = recoveredJobsCount;

    if (recoveredJobsCount === 0) {
      return;
    }

    if (rejectedCount > 0) {
      await workerLogger.error("ingestion.worker.recovery_enqueue_failed", {
        queuedJobs: recoveredJobsCount,
        rejectedCount,
      });
      console.error("ingestion.worker.recovery_enqueue_failed", {
        queuedJobs: recoveredJobsCount,
        rejectedCount,
      });
      return;
    }

    await logInfo({
      eventName: "ingestion.worker.recovery_enqueued",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
      payload: {
        queuedJobs: recoveredJobsCount,
      },
    });
    console.log("ingestion.worker.recovery_enqueued", {
      queuedJobs: recoveredJobsCount,
    });
  } catch (error) {
    lastError = error instanceof Error ? error.message : String(error);
    await reportError({
      error,
      eventName: "ingestion.worker.recovery_error",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
    });
    console.error("ingestion.worker.recovery_error", error);
  }
}

const ingestionWorker = createIngestionQueueWorker(processQueuedJob, {
  concurrency: workerConcurrency,
});

ingestionWorker.worker.on("error", (error) => {
  lastError = error instanceof Error ? error.message : String(error);
  void reportError({
    error,
    eventName: "ingestion.worker.error",
    context: {
      feature: "ingestion",
      service: "ingestion-worker",
    },
  });
  console.error("ingestion.worker.error", error);
});

app.get("/health", (c) => {
  return c.json({
    ok: true,
    service: "ingestion-worker",
    isRunning: activeJobs > 0,
    activeJobs,
    workerConcurrency,
    queueName: "avenire-ingestion",
    lastError,
    lastJobDurationMs,
    recoverySweepMs,
    lastRecoverySweepAt,
    lastRecoveredJobsCount,
  });
});

serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    void logInfo({
      eventName: "ingestion.worker.started",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
      payload: {
        port: info.port,
        workerConcurrency,
      },
    });
    console.log(`Ingestion worker listening on http://localhost:${info.port}`);
  }
);

const shutdown = async () => {
  await ingestionWorker.close().catch((error) => {
    void reportError({
      error,
      eventName: "ingestion.worker.close_failed",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
    });
    console.error("Failed to close ingestion BullMQ worker", error);
  });
  shutdownObservability();
  process.exit(0);
};

process.on("SIGINT", () => {
  shutdown().catch((error) => {
    void reportError({
      error,
      eventName: "ingestion.worker.sigint_shutdown_failed",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
      payload: {
        error: safeError(error),
      },
    });
    console.error("Failed to shut down ingestion worker on SIGINT", error);
    process.exit(1);
  });
});
process.on("SIGTERM", () => {
  shutdown().catch((error) => {
    void reportError({
      error,
      eventName: "ingestion.worker.sigterm_shutdown_failed",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
      payload: {
        error: safeError(error),
      },
    });
    console.error("Failed to shut down ingestion worker on SIGTERM", error);
    process.exit(1);
  });
});

recoverQueuedJobs().catch((error) => {
  void reportError({
    error,
    eventName: "ingestion.worker.initial_recovery_failed",
    context: {
      feature: "ingestion",
      service: "ingestion-worker",
    },
  });
  console.error("Failed initial ingestion queue recovery sweep", error);
});
setInterval(() => {
  recoverQueuedJobs().catch((error) => {
    void reportError({
      error,
      eventName: "ingestion.worker.scheduled_recovery_failed",
      context: {
        feature: "ingestion",
        service: "ingestion-worker",
      },
    });
    console.error("Failed scheduled ingestion queue recovery sweep", error);
  });
}, recoverySweepMs);
