import { NextResponse } from "next/server";
import { invalidateWorkspaceReadCaches } from "@/lib/domain-cache";
import { registerWorkspaceUploadedFile } from "@/lib/upload-registration";
import { scheduleAsyncVideoDeliveryOptimization } from "@/lib/video-delivery-optimization-runtime";
import {
  classifyStoredFileType,
  WORKSPACE_FILE_REGISTER_ERROR,
  type WorkspaceFileRegisterBody,
  type WorkspaceFileRegisterLogger,
} from "./workspace-file-register-model";

export async function registerWorkspaceStoredUpload(input: {
  apiLogger: WorkspaceFileRegisterLogger;
  body: WorkspaceFileRegisterBody;
  userId: string;
  workspaceUuid: string;
}) {
  if (
    !(
      input.body.folderId &&
      input.body.storageKey &&
      input.body.storageUrl &&
      input.body.name
    ) ||
    typeof input.body.sizeBytes !== "number"
  ) {
    void input.apiLogger.requestFailed(400, "Missing file metadata", {
      workspaceUuid: input.workspaceUuid,
    });
    return NextResponse.json(
      { error: "Missing file metadata" },
      { status: 400 }
    );
  }

  let registrationResult: Awaited<
    ReturnType<typeof registerWorkspaceUploadedFile>
  >;
  try {
    registrationResult = await registerWorkspaceUploadedFile({
      workspaceUuid: input.workspaceUuid,
      userId: input.userId,
      folderId: input.body.folderId,
      storageKey: input.body.storageKey,
      storageUrl: input.body.storageUrl,
      name: input.body.name,
      mimeType: input.body.mimeType,
      sizeBytes: input.body.sizeBytes,
      metadata: {
        ...(input.body.metadata ?? {}),
      },
      contentHashSha256: input.body.contentHashSha256,
      hashComputedBy: input.body.hashComputedBy,
    });
  } catch (error) {
    const isStorageLimit =
      (error as { code?: string } | null | undefined)?.code === "STORAGE_LIMIT";
    if (isStorageLimit) {
      void input.apiLogger.rateLimited("storage", null, {
        workspaceUuid: input.workspaceUuid,
      });
      return NextResponse.json(
        { error: "Storage limit reached" },
        { status: 429 }
      );
    }

    void input.apiLogger.requestFailed(500, error, {
      workspaceUuid: input.workspaceUuid,
    });
    return NextResponse.json(
      { error: WORKSPACE_FILE_REGISTER_ERROR },
      { status: 500 }
    );
  }

  const storedFile = registrationResult.file;
  const ingestionJob = registrationResult.ingestionJob;

  if (
    registrationResult.status === "created" &&
    storedFile.mimeType?.startsWith("video/")
  ) {
    scheduleAsyncVideoDeliveryOptimization({
      file: storedFile,
      userId: input.userId,
      workspaceUuid: input.workspaceUuid,
    });
  }

  const fileType = classifyStoredFileType(storedFile.mimeType);
  void input.apiLogger.meter("meter.upload.filesystem.registered", {
    workspaceUuid: input.workspaceUuid,
    fileId: storedFile.id,
    mimeType: storedFile.mimeType,
    fileType,
    sizeBytes: storedFile.sizeBytes,
  });
  void input.apiLogger.meter("meter.upload.file_type", {
    workspaceUuid: input.workspaceUuid,
    fileType,
    mimeType: storedFile.mimeType,
  });
  void input.apiLogger.featureUsed("workspace.filesystem.upload", {
    workspaceUuid: input.workspaceUuid,
    fileId: storedFile.id,
  });
  void input.apiLogger.requestSucceeded(201, {
    workspaceUuid: input.workspaceUuid,
    fileId: storedFile.id,
    deduplicated: registrationResult.status === "deduplicated",
    mimeType: storedFile.mimeType,
    sizeBytes: storedFile.sizeBytes,
  });
  await invalidateWorkspaceReadCaches(input.workspaceUuid);

  return NextResponse.json(
    {
      file: storedFile,
      ingestionJob,
      deduplicated: registrationResult.status === "deduplicated",
    },
    { status: registrationResult.status === "deduplicated" ? 200 : 201 }
  );
}
