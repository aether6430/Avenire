import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { writeMultipartPart } from "@/lib/upload-multipart-write";
import { getUploadSession } from "@/lib/upload-session-store";
import { verifyUploadSessionPartToken } from "@/lib/upload-session-token";
import {
  isUploadSessionExpired,
  parseUploadSessionPartNumber,
  resolveUploadSessionMaxPartBytes,
} from "../upload-session-parts-model";

export async function handleUploadSessionPartPut(input: {
  partNumberRaw: string;
  request: Request;
  sessionId: string;
}) {
  const requestStartedAt = Date.now();
  const session = await getUploadSession(input.sessionId);
  const apiLogger = createApiLogger({
    request: input.request,
    route: "/api/uploads/sessions/[sessionId]/parts/[partNumber]",
    feature: "uploads",
    userId: session?.userId ?? null,
    workspaceId: session?.workspaceUuid ?? null,
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (isUploadSessionExpired(session.expiresAt)) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const partNumber = parseUploadSessionPartNumber(input.partNumberRaw);
  if (!partNumber) {
    return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
  }

  const url = new URL(input.request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const verification = verifyUploadSessionPartToken(token, {
    sessionId: input.sessionId,
    workspaceUuid: session.workspaceUuid,
    partNumber,
  });
  if (!verification.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: verification.reason },
      { status: 401 }
    );
  }

  if (!input.request.body) {
    return NextResponse.json({ error: "Empty part payload" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof writeMultipartPart>>;
  try {
    result = await writeMultipartPart({
      sessionId: input.sessionId,
      partNumber,
      maxBytes: resolveUploadSessionMaxPartBytes(),
      stream: input.request.body,
    });
  } catch (error) {
    if (
      (error as { code?: string } | null | undefined)?.code ===
      "UPLOAD_PART_TOO_LARGE"
    ) {
      void apiLogger.warn("upload.session.part.too_large", {
        durationMs: Date.now() - requestStartedAt,
        maxPartBytes: resolveUploadSessionMaxPartBytes(),
        partNumber,
        sessionId: input.sessionId,
      });
      return NextResponse.json(
        {
          error: "Part too large",
          maxPartBytes: resolveUploadSessionMaxPartBytes(),
        },
        { status: 413 }
      );
    }
    void apiLogger.requestFailed(500, error, {
      durationMs: Date.now() - requestStartedAt,
      partNumber,
      sessionId: input.sessionId,
    });
    throw error;
  }

  if (result.sizeBytes === 0) {
    return NextResponse.json({ error: "Empty part payload" }, { status: 400 });
  }

  void apiLogger.info("upload.session.part.received", {
    durationMs: Date.now() - requestStartedAt,
    partNumber: result.partNumber,
    sessionAgeMs: Math.max(
      0,
      Date.now() - new Date(session.createdAt).getTime()
    ),
    sessionId: input.sessionId,
    sizeBytes: result.sizeBytes,
  });

  return NextResponse.json({
    ok: true,
    etag: result.etag,
    partNumber: result.partNumber,
    sizeBytes: result.sizeBytes,
  });
}
