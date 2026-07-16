import { NextResponse } from "next/server";
import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { parseJsonRequest } from "@/lib/api-request";
import { userCanEditFolder } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { normalizeSha256 } from "@/lib/upload-registration";
import {
  getUploadSession,
  withUploadSessionCompletionLock,
} from "@/lib/upload-session-store";
import { getSessionUser } from "@/lib/workspace";
import { finalizeUploadSessionCompletion } from "./upload-session-complete-finalize";
import {
  buildUploadCompletionReplayResponse,
  completeSchema,
  readExpectedMultipartPartNumbers,
  readUploadCompletionErrorCode,
} from "./upload-session-complete-model";
import {
  cleanupUploadedStorageObject,
  completeMultipartUploadSession,
} from "./upload-session-complete-storage";

async function completeUploadSessionRequest(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const requestStartedAt = Date.now();
    const user = await getSessionUser();
    const apiLogger = createApiLogger({
      request,
      route: "/api/uploads/sessions/[sessionId]/complete",
      feature: "uploads",
      userId: user?.id ?? null,
    });
    void apiLogger.requestStarted();

    if (!user) {
      void apiLogger.requestFailed(401, "Unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const session = await getUploadSession(sessionId);
    if (!session) {
      void apiLogger.requestFailed(404, "Session not found");
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    if (session.userId !== user.id) {
      void apiLogger.requestFailed(403, "Forbidden");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (new Date(session.expiresAt).getTime() <= Date.now()) {
      void apiLogger.requestFailed(410, "Session expired");
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    const canEdit = await userCanEditFolder({
      workspaceId: session.workspaceUuid,
      folderId: session.folderId,
      userId: user.id,
    });
    if (!canEdit) {
      void apiLogger.requestFailed(403, "Read-only folder");
      return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
    }

    const sessionStartedAt = new Date(session.createdAt).getTime();

    if (session.result?.fileId) {
      void apiLogger.requestSucceeded(200, {
        completionDurationMs: Date.now() - requestStartedAt,
        workspaceUuid: session.workspaceUuid,
        sessionId: session.id,
        fileId: session.result.fileId,
        idempotentReplay: true,
        sessionUploadDurationMs: Math.max(0, Date.now() - sessionStartedAt),
        sizeBytes: session.upload?.sizeBytes ?? session.sizeBytes,
      });
      return buildUploadCompletionReplayResponse({ session });
    }

    const parsed = await parseJsonRequest(request, completeSchema);
    if (!parsed.success) {
      void apiLogger.requestFailed(400, "Invalid payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let multipartUpload: Awaited<ReturnType<typeof completeMultipartUploadSession>>;
    try {
      multipartUpload = await completeMultipartUploadSession({
        sessionId,
        name: session.name,
        mimeType: session.mimeType,
        expectedPartNumbers: readExpectedMultipartPartNumbers(parsed.data),
      });
    } catch (error) {
      const errorCode = readUploadCompletionErrorCode(error);
      const isUnavailable = errorCode === "UPLOADTHING_UNAVAILABLE";
      const isPartMismatch = errorCode === "MULTIPART_PART_MISMATCH";
      const isContentMismatch =
        errorCode === "UPLOAD_MIME_MISMATCH" ||
        errorCode === "UPLOAD_MIME_UNSUPPORTED";
      const status = isUnavailable ? 503 : isPartMismatch || isContentMismatch ? 422 : 500;
      void apiLogger.requestFailed(status, error, {
        workspaceUuid: session.workspaceUuid,
        sessionId: session.id,
      });
      return NextResponse.json(
        {
          error: isPartMismatch
            ? "Multipart parts mismatch"
            : isContentMismatch
              ? "Uploaded content does not match its declared file type"
              : isUnavailable
                ? "Multipart completion unavailable"
                : "Multipart completion failed",
        },
        { status }
      );
    }
    const {
      checksumSha256: assembledChecksumSha256,
      partCount: multipartPartCount,
      sizeBytes,
      storageKey,
      storageUrl,
    } = multipartUpload;
    const checksumSha256 = assembledChecksumSha256;

    const expectedChecksum = normalizeSha256(session.checksumSha256);
    if (
      expectedChecksum &&
      expectedChecksum !== checksumSha256
    ) {
      await cleanupUploadedStorageObject(storageKey);
      void apiLogger.requestFailed(422, "Checksum mismatch");
      return NextResponse.json({ error: "Checksum mismatch" }, { status: 422 });
    }

    if (session.sizeBytes > 0 && sizeBytes !== session.sizeBytes) {
      await cleanupUploadedStorageObject(storageKey);
      void apiLogger.requestFailed(422, "Size mismatch");
      return NextResponse.json({ error: "Size mismatch" }, { status: 422 });
    }

    return await finalizeUploadSessionCompletion({
      apiLogger,
      checksumSha256,
      metadata: parsed.data.metadata,
      mimeType: session.mimeType,
      multipartPartCount,
      requestStartedAt,
      session,
      sessionId,
      sizeBytes,
      storageKey,
      storageUrl,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveApiErrorMessage(
          error,
          "Unable to complete upload session."
        ),
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  const params = await context.params;
  return withUploadSessionCompletionLock(params.sessionId, () =>
    completeUploadSessionRequest(request, { params: Promise.resolve(params) })
  );
}
