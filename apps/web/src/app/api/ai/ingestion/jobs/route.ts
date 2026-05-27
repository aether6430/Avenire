import { listRecentIngestionJobsForWorkspace } from "@avenire/database";
import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFileAssetById } from "@/lib/file-data";
import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

const enqueueSchema = z.object({
  workspaceUuid: z.string().trim().uuid(),
  fileUuid: z.string().trim().uuid(),
  sourceType: z.string().optional(),
});

const listSchema = z.object({
  workspaceUuid: z.string().trim().uuid(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  windowMinutes: z.coerce.number().int().min(1).max(240).optional(),
});

const DEFAULT_INGESTION_JOBS_LIMIT = 60;
const DEFAULT_INGESTION_JOBS_WINDOW_MINUTES = 10;
const INGESTION_JOBS_LIST_ERROR = "Unable to load ingestion jobs.";
const INGESTION_JOBS_ENQUEUE_ERROR = "Unable to queue ingestion job.";

function parseIngestionJobsListQuery(request: Request) {
  const { searchParams } = new URL(request.url);
  return listSchema.safeParse({
    workspaceUuid: searchParams.get("workspaceUuid") ?? "",
    limit: searchParams.get("limit") ?? undefined,
    windowMinutes: searchParams.get("windowMinutes") ?? undefined,
  });
}

function parseIngestionJobsEnqueueBody(body: unknown) {
  return enqueueSchema.safeParse(body);
}

function resolveIngestionJobsLimit(limit?: number) {
  return limit ?? DEFAULT_INGESTION_JOBS_LIMIT;
}

function resolveIngestionJobsWindowMinutes(windowMinutes?: number) {
  return windowMinutes ?? DEFAULT_INGESTION_JOBS_WINDOW_MINUTES;
}

function filterIngestionJobsWindow<
  T extends {
    status: string;
    updatedAt: string;
  },
>(
  jobs: T[],
  input?: {
    nowMs?: number;
    windowMinutes?: number;
  }
) {
  const nowMs = input?.nowMs ?? Date.now();
  const windowMs =
    resolveIngestionJobsWindowMinutes(input?.windowMinutes) * 60 * 1000;

  return jobs.filter((job) => {
    if (job.status === "queued" || job.status === "running") {
      return true;
    }

    const updatedAt = new Date(job.updatedAt).getTime();
    return Number.isFinite(updatedAt) && nowMs - updatedAt <= windowMs;
  });
}

function resolveIngestionJobsRouteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}

export async function GET(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseIngestionJobsListQuery(request);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      parsed.data.workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const jobs = await listRecentIngestionJobsForWorkspace({
      workspaceId: parsed.data.workspaceUuid,
      limit: resolveIngestionJobsLimit(parsed.data.limit),
    });

    return NextResponse.json({
      jobs: filterIngestionJobsWindow(jobs, {
        windowMinutes: parsed.data.windowMinutes,
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveIngestionJobsRouteError(error, INGESTION_JOBS_LIST_ERROR),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = parseIngestionJobsEnqueueBody(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      parsed.data.workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const file = await getFileAssetById(
      parsed.data.workspaceUuid,
      parsed.data.fileUuid
    );
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const job = await scheduleIngestionJob({
      workspaceId: parsed.data.workspaceUuid,
      fileId: file.id,
      sourceType: parsed.data.sourceType,
    });

    await publishWorkspaceStreamEvent({
      workspaceUuid: parsed.data.workspaceUuid,
      type: "ingestion.job",
      payload: {
        createdAt: new Date().toISOString(),
        eventType: "job.queued",
        jobId: job.id,
        payload: {
          status: "queued",
          sourceType: parsed.data.sourceType ?? null,
        },
        workspaceId: parsed.data.workspaceUuid,
      },
    });

    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveIngestionJobsRouteError(
          error,
          INGESTION_JOBS_ENQUEUE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
