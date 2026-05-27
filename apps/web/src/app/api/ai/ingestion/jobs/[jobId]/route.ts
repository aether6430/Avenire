import { getIngestionJobByIdForWorkspace } from "@avenire/database";
import { NextResponse } from "next/server";
import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { ensureWorkspaceAccessForUser, getSessionUser } from "@/lib/workspace";

const INGESTION_JOB_LOAD_ERROR = "Unable to load ingestion job.";

function resolveIngestionJobsRouteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}

function resolveIngestionJobWorkspaceUuid(request: Request) {
  return new URL(request.url).searchParams.get("workspaceUuid")?.trim() ?? "";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceUuid = resolveIngestionJobWorkspaceUuid(request);
    if (!workspaceUuid) {
      return NextResponse.json(
        { error: "Missing workspaceUuid" },
        { status: 400 }
      );
    }

    const canAccess = await ensureWorkspaceAccessForUser(
      user.id,
      workspaceUuid
    );
    if (!canAccess) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { jobId } = await context.params;
    const job = await getIngestionJobByIdForWorkspace(workspaceUuid, jobId);
    if (!job) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveIngestionJobsRouteError(error, INGESTION_JOB_LOAD_ERROR),
      },
      { status: 500 }
    );
  }
}
