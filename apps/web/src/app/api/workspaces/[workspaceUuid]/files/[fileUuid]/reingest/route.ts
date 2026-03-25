import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { consumeUploadUnits } from "@/lib/billing";
import { getFileAssetById, userCanEditFile } from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { deleteIngestionDataForFile } from "@/lib/ingestion-data";
import { getSessionUser } from "@/lib/workspace";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";

export async function POST(
  _request: Request,
  context: { params: Promise<{ workspaceUuid: string; fileUuid: string }> }
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workspaceUuid, fileUuid } = await context.params;
  const canEdit = await userCanEditFile({
    workspaceId: workspaceUuid,
    fileId: fileUuid,
    userId: user.id,
  });
  if (!canEdit) {
    return NextResponse.json({ error: "Read-only file" }, { status: 403 });
  }

  const file = await getFileAssetById(workspaceUuid, fileUuid);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const usage = await consumeUploadUnits(user.id, 1);
  if (!usage.ok) {
    return NextResponse.json(
      {
        error: "Upload usage limit reached",
        retryAfter: usage.retryAfter?.toISOString() ?? null,
      },
      { status: 429 }
    );
  }

  await deleteIngestionDataForFile(workspaceUuid, fileUuid);
  const job = await scheduleIngestionJob({
    workspaceId: workspaceUuid,
    fileId: fileUuid,
    sourceType: "manual.reingest",
  });

  await Promise.allSettled([
    publishFilesInvalidationEvent({
      workspaceUuid,
      folderId: file.folderId || undefined,
      reason: "file.updated",
    }),
    publishWorkspaceStreamEvent({
      workspaceUuid,
      type: "ingestion.job",
      payload: {
        createdAt: new Date().toISOString(),
        eventType: "job.queued",
        jobId: job.id,
        payload: {
          status: "queued",
          source: "manual.reingest",
        },
        workspaceId: workspaceUuid,
      },
    }),
  ]);

  return NextResponse.json({ job }, { status: 202 });
}
