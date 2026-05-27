import { NextResponse } from "next/server";
import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { userCanEditFolder } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { normalizeSha256 } from "@/lib/upload-registration";
import { getUploadSession } from "@/lib/upload-session-store";
import { getSessionUser } from "@/lib/workspace";
import { finalizeUploadSessionCompletion } from "./upload-session-complete-finalize";
import {
  asNullableString,
  buildUploadCompletionReplayResponse,
  completeSchema,
} from "./upload-session-complete-model";
import { completeMultipartUploadSession } from "./upload-session-complete-storage";

export async function POST(
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

    const parsed = completeSchema.safeParse(
      await request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      void apiLogger.requestFailed(400, "Invalid payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    let storageKey = parsed.data.storageKey;
    let storageUrl = parsed.data.storageUrl;
    let sizeBytes = parsed.data.sizeBytes;
    let checksumSha256 = normalizeSha256(parsed.data.checksumSha256);
    let multipartPartCount = 0;

    if (!(storageKey && storageUrl) || typeof sizeBytes !== "number") {
      try {
        const multipartUpload = await completeMultipartUploadSession({
          sessionId,
          name: session.name,
          mimeType: asNullableString(parsed.data.mimeType) ?? session.mimeType,
          expectedPartNumbers: parsed.data.multipart?.partNumbers,
        });
        storageKey = multipartUpload.storageKey;
        storageUrl = multipartUpload.storageUrl;
        sizeBytes = multipartUpload.sizeBytes;
        checksumSha256 = checksumSha256 ?? multipartUpload.checksumSha256;
        multipartPartCount = multipartUpload.partCount;
      } catch (error) {
        const isUnavailable =
          (error as { code?: string } | null | undefined)?.code ===
          "UPLOADTHING_UNAVAILABLE";
        const isPartMismatch =
          (error as { code?: string } | null | undefined)?.code ===
          "MULTIPART_PART_MISMATCH";
        void apiLogger.requestFailed(isUnavailable ? 503 : 500, error, {
          workspaceUuid: session.workspaceUuid,
          sessionId: session.id,
        });
        return NextResponse.json(
          {
            error: isPartMismatch
              ? "Multipart parts mismatch"
              : isUnavailable
                ? "Multipart completion unavailable"
                : "Multipart completion failed",
          },
          { status: isPartMismatch ? 422 : isUnavailable ? 503 : 500 }
        );
      }
    }

    if (!(storageKey && storageUrl) || typeof sizeBytes !== "number") {
      void apiLogger.requestFailed(
        400,
        "Missing upload metadata after completion"
      );
      return NextResponse.json(
        { error: "Missing upload metadata after completion" },
        { status: 400 }
      );
    }

    const expectedChecksum = normalizeSha256(session.checksumSha256);
    if (
      expectedChecksum &&
      checksumSha256 &&
      expectedChecksum !== checksumSha256
    ) {
      void apiLogger.requestFailed(422, "Checksum mismatch");
      return NextResponse.json({ error: "Checksum mismatch" }, { status: 422 });
    }

    if (session.sizeBytes > 0 && sizeBytes !== session.sizeBytes) {
      void apiLogger.requestFailed(422, "Size mismatch");
      return NextResponse.json({ error: "Size mismatch" }, { status: 422 });
    }

    if (
      session.mimeType &&
      parsed.data.mimeType &&
      session.mimeType !== parsed.data.mimeType
    ) {
      void apiLogger.requestFailed(422, "MIME type mismatch");
      return NextResponse.json(
        { error: "MIME type mismatch" },
        { status: 422 }
      );
    }

    return await finalizeUploadSessionCompletion({
      apiLogger,
      checksumSha256,
      metadata: parsed.data.metadata,
      mimeType: asNullableString(parsed.data.mimeType) ?? session.mimeType,
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
