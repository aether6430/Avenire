import { scheduleIngestionJob } from "@avenire/ingestion/queue";
import { NextResponse } from "next/server";
import { getFileAssetById, userCanEditFile } from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import { deleteIngestionDataForFile } from "@/lib/ingestion-data";
import { publishWorkspaceStreamEvent } from "@/lib/workspace-event-stream";
import {
  buildWorkspaceFileReingestStreamEvent,
  resolveWorkspaceFileReingestRouteError,
  WORKSPACE_FILE_REINGEST_ERROR,
} from "./workspace-file-reingest-route-model";

export async function handleWorkspaceFileReingestPost(input: {
  fileUuid: string;
  userId: string;
  workspaceUuid: string;
}) {
  try {
    const canEdit = await userCanEditFile({
      workspaceId: input.workspaceUuid,
      fileId: input.fileUuid,
      userId: input.userId,
    });
    if (!canEdit) {
      return NextResponse.json({ error: "Read-only file" }, { status: 403 });
    }

    const file = await getFileAssetById(input.workspaceUuid, input.fileUuid);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await deleteIngestionDataForFile(input.workspaceUuid, input.fileUuid);
    const job = await scheduleIngestionJob({
      workspaceId: input.workspaceUuid,
      fileId: input.fileUuid,
      sourceType: "manual.reingest",
    });

    await Promise.allSettled([
      publishFilesInvalidationEvent({
        workspaceUuid: input.workspaceUuid,
        folderId: file.folderId || undefined,
        reason: "file.updated",
      }),
      publishWorkspaceStreamEvent({
        workspaceUuid: input.workspaceUuid,
        type: "ingestion.job",
        payload: buildWorkspaceFileReingestStreamEvent({
          createdAt: new Date().toISOString(),
          jobId: job.id,
          workspaceUuid: input.workspaceUuid,
        }),
      }),
    ]);

    return NextResponse.json({ job }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveWorkspaceFileReingestRouteError(
          error,
          WORKSPACE_FILE_REINGEST_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
