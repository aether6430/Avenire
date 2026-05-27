import { NextResponse } from "next/server";
import type { createApiLogger } from "@/lib/observability";
import { clearMultipartParts } from "@/lib/upload-multipart-assembly";
import { registerWorkspaceUploadedFile } from "@/lib/upload-registration";
import {
  saveUploadSession,
  type UploadSessionRecord,
} from "@/lib/upload-session-store";
import { scheduleAsyncVideoDeliveryOptimization } from "@/lib/video-delivery-optimization-runtime";
import { buildUploadCompletionSuccessResponse } from "./upload-session-complete-model";
import { cleanupUploadedStorageObject } from "./upload-session-complete-storage";

interface FinalizeUploadSessionCompletionOptions {
  apiLogger: ReturnType<typeof createApiLogger>;
  checksumSha256: string | null;
  metadata?: Record<string, unknown>;
  mimeType: string | null;
  multipartPartCount: number;
  requestStartedAt: number;
  session: UploadSessionRecord;
  sessionId: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
  user: {
    id: string;
  };
}

export async function finalizeUploadSessionCompletion({
  apiLogger,
  checksumSha256,
  metadata,
  mimeType,
  multipartPartCount,
  requestStartedAt,
  session,
  sessionId,
  sizeBytes,
  storageKey,
  storageUrl,
  user,
}: FinalizeUploadSessionCompletionOptions) {
  const sessionStartedAt = new Date(session.createdAt).getTime();
  const uploadedSession = await saveUploadSession({
    ...session,
    status: "uploaded",
    upload: {
      storageKey,
      storageUrl,
      mimeType,
      sizeBytes,
      checksumSha256,
    },
  });

  const verifiedSession = await saveUploadSession({
    ...uploadedSession,
    status: "verified",
  });

  try {
    const result = await registerWorkspaceUploadedFile({
      workspaceUuid: session.workspaceUuid,
      userId: user.id,
      folderId: session.folderId,
      storageKey,
      storageUrl,
      name: session.name,
      mimeType,
      sizeBytes,
      metadata,
      contentHashSha256: checksumSha256 ?? session.checksumSha256,
      hashComputedBy: "client",
    });

    const completedSession = await saveUploadSession({
      ...verifiedSession,
      status: "ingestion_queued",
      result: {
        fileId: result.file.id,
        ingestionJobId: result.ingestionJob?.id ?? null,
        deduplicated: result.status === "deduplicated",
      },
    });

    if (
      result.status === "created" &&
      result.file.mimeType?.startsWith("video/")
    ) {
      scheduleAsyncVideoDeliveryOptimization({
        file: result.file,
        userId: user.id,
        workspaceUuid: session.workspaceUuid,
      });
    }

    await clearMultipartParts(sessionId);

    void apiLogger.requestSucceeded(200, {
      completionDurationMs: Date.now() - requestStartedAt,
      workspaceUuid: session.workspaceUuid,
      sessionId: session.id,
      fileId: result.file.id,
      ingestionJobId: result.ingestionJob?.id ?? null,
      deduplicated: result.status === "deduplicated",
      multipartPartCount: multipartPartCount || undefined,
      sessionUploadDurationMs: Math.max(0, Date.now() - sessionStartedAt),
      sizeBytes,
    });
    void apiLogger.info("upload.session.completed", {
      completionDurationMs: Date.now() - requestStartedAt,
      deduplicated: result.status === "deduplicated",
      multipartPartCount: multipartPartCount || undefined,
      sessionId: session.id,
      sessionUploadDurationMs: Math.max(0, Date.now() - sessionStartedAt),
      sizeBytes,
      workspaceUuid: session.workspaceUuid,
    });

    return buildUploadCompletionSuccessResponse({
      file: result.file,
      ingestionJob: result.ingestionJob,
      session: completedSession,
    });
  } catch (error) {
    const failedSession = await saveUploadSession({
      ...verifiedSession,
      status: "failed",
    });
    const cleanupStorageKey =
      verifiedSession.upload?.storageKey ??
      session.upload?.storageKey ??
      storageKey ??
      null;

    try {
      await cleanupUploadedStorageObject(cleanupStorageKey);
    } catch (cleanupError) {
      void apiLogger.warn("upload.cleanup.failed", {
        workspaceUuid: session.workspaceUuid,
        sessionId: session.id,
        storageKey: cleanupStorageKey,
        error:
          cleanupError instanceof Error
            ? { name: cleanupError.name, message: cleanupError.message }
            : { message: "Unknown cleanup error" },
      });
    }

    const isStorageLimit =
      (error as { code?: string } | null | undefined)?.code === "STORAGE_LIMIT";

    void apiLogger.requestFailed(isStorageLimit ? 429 : 500, error, {
      completionDurationMs: Date.now() - requestStartedAt,
      workspaceUuid: session.workspaceUuid,
      sessionId: session.id,
      sessionUploadDurationMs: Math.max(0, Date.now() - sessionStartedAt),
      sizeBytes: sizeBytes ?? null,
    });

    return NextResponse.json(
      {
        error: isStorageLimit
          ? "Storage limit reached"
          : "Upload finalize failed",
        session: failedSession,
      },
      { status: isStorageLimit ? 429 : 500 }
    );
  }
}
