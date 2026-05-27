import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import {
  getUploadSession,
  saveUploadSession,
} from "@/lib/upload-session-store";
import { createUploadSessionPartToken } from "@/lib/upload-session-token";
import {
  resolveUploadSessionRouteError,
  UPLOAD_SESSION_PARTS_ERROR,
} from "../../upload-session-route-model";
import {
  buildUploadSessionPartUploadUrl,
  isUploadSessionExpired,
  resolveUploadSessionMaxPartBytes,
  uploadSessionPartsSchema,
} from "./upload-session-parts-model";

export async function handleUploadSessionPartsPost(input: {
  request: Request;
  sessionId: string;
  userId: string;
}) {
  const apiLogger = createApiLogger({
    request: input.request,
    route: "/api/uploads/sessions/[sessionId]/parts",
    feature: "uploads",
    userId: input.userId,
  });
  void apiLogger.requestStarted();

  try {
    const session = await getUploadSession(input.sessionId);
    if (!session) {
      void apiLogger.requestFailed(404, "Session not found");
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (session.userId !== input.userId) {
      void apiLogger.requestFailed(403, "Forbidden");
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (isUploadSessionExpired(session.expiresAt)) {
      void apiLogger.requestFailed(410, "Session expired");
      return NextResponse.json({ error: "Session expired" }, { status: 410 });
    }

    const parsed = uploadSessionPartsSchema.safeParse(
      await input.request.json().catch(() => ({}))
    );
    if (!parsed.success) {
      void apiLogger.requestFailed(400, "Invalid payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updated = await saveUploadSession({
      ...session,
      status: "uploading",
    });
    const ttlSeconds = 15 * 60;
    const baseUrl = new URL(input.request.url);
    const partUrls = parsed.data.partNumbers.map((partNumber) => {
      const token = createUploadSessionPartToken({
        userId: session.userId,
        workspaceUuid: session.workspaceUuid,
        sessionId: session.id,
        partNumber,
        ttlSeconds,
      });
      return {
        expiresInSeconds: ttlSeconds,
        method: "PUT" as const,
        partNumber,
        uploadUrl: buildUploadSessionPartUploadUrl({
          origin: baseUrl.origin,
          partNumber,
          sessionId: session.id,
          token,
        }),
      };
    });

    void apiLogger.requestSucceeded(200, {
      workspaceUuid: updated.workspaceUuid,
      sessionId: updated.id,
      partCount: parsed.data.partNumbers.length,
    });

    return NextResponse.json({
      ok: true,
      session: updated,
      mode: "session-multipart",
      maxPartBytes: resolveUploadSessionMaxPartBytes(),
      parts: partUrls,
      message:
        "Upload each part using PUT to the provided uploadUrl. Call /complete once all parts are uploaded.",
    });
  } catch (error) {
    void apiLogger.requestFailed(500, error, {
      sessionId: input.sessionId,
    });
    return NextResponse.json(
      {
        error: resolveUploadSessionRouteError(
          error,
          UPLOAD_SESSION_PARTS_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
