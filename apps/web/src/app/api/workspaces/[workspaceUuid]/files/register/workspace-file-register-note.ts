import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import { createWorkspaceNoteFile } from "@/lib/file-data";
import { publishFilesInvalidationEvent } from "@/lib/files-realtime-publisher";
import {
  classifyStoredFileType,
  resolveWorkspaceFileRegisterMetadata,
  WORKSPACE_FILE_REGISTER_ERROR,
  type WorkspaceFileRegisterBody,
  type WorkspaceFileRegisterLogger,
} from "./workspace-file-register-model";

export async function registerWorkspaceNoteFromContent(input: {
  apiLogger: WorkspaceFileRegisterLogger;
  body: WorkspaceFileRegisterBody & {
    content: string;
    folderId: string;
    name?: string;
  };
  userId: string;
  workspaceUuid: string;
}) {
  if (!input.body.name) {
    void input.apiLogger.requestFailed(400, "Missing note metadata", {
      workspaceUuid: input.workspaceUuid,
    });
    return NextResponse.json(
      { error: "Missing note metadata" },
      { status: 400 }
    );
  }

  try {
    const metadata = resolveWorkspaceFileRegisterMetadata(
      input.body.metadata,
      input.body.content
    );

    const file = await createWorkspaceNoteFile({
      workspaceId: input.workspaceUuid,
      userId: input.userId,
      folderId: input.body.folderId,
      name: input.body.name,
      baseContent: input.body.content,
      content: input.body.content,
      metadata,
    });

    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      folderId: input.body.folderId,
      reason: "file.created",
    });
    await publishFilesInvalidationEvent({
      workspaceUuid: input.workspaceUuid,
      reason: "tree.changed",
    });
    await invalidateWorkspaceReadCaches(input.workspaceUuid);

    const fileType = classifyStoredFileType(file.mimeType);
    void input.apiLogger.meter("meter.upload.filesystem.registered", {
      workspaceUuid: input.workspaceUuid,
      fileId: file.id,
      mimeType: file.mimeType,
      fileType,
      sizeBytes: file.sizeBytes,
    });
    void input.apiLogger.meter("meter.upload.file_type", {
      workspaceUuid: input.workspaceUuid,
      fileType,
      mimeType: file.mimeType,
    });
    void input.apiLogger.featureUsed("workspace.filesystem.upload", {
      workspaceUuid: input.workspaceUuid,
      fileId: file.id,
    });
    void input.apiLogger.requestSucceeded(201, {
      workspaceUuid: input.workspaceUuid,
      fileId: file.id,
      deduplicated: false,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
    });

    return NextResponse.json(
      {
        file,
        ingestionJob: null,
        deduplicated: false,
      },
      { status: 201 }
    );
  } catch (error) {
    void input.apiLogger.requestFailed(500, error, {
      workspaceUuid: input.workspaceUuid,
    });
    return NextResponse.json(
      { error: WORKSPACE_FILE_REGISTER_ERROR },
      { status: 500 }
    );
  }
}
