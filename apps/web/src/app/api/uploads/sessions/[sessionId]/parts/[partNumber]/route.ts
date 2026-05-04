import { NextResponse } from "next/server";
import { createApiLogger } from "@/lib/observability";
import { writeMultipartPart } from "@/lib/upload-multipart-store";
import { getUploadSession } from "@/lib/upload-session-store";
import { verifyUploadSessionPartToken } from "@/lib/upload-session-token";

function resolveMaxPartBytes() {
  const parsed = Number.parseInt(
    process.env.UPLOAD_SESSION_MAX_PART_BYTES ?? "",
    10
  );
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 16 * 1024 * 1024;
  }
  return parsed;
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ sessionId: string; partNumber: string }> }
) {
  const requestStartedAt = Date.now();
  const { sessionId, partNumber: partNumberRaw } = await context.params;
  const session = await getUploadSession(sessionId);
  const apiLogger = createApiLogger({
    request,
    route: "/api/uploads/sessions/[sessionId]/parts/[partNumber]",
    feature: "uploads",
    userId: session?.userId ?? null,
    workspaceId: session?.workspaceUuid ?? null,
  });
  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Session expired" }, { status: 410 });
  }

  const partNumber = Number.parseInt(partNumberRaw, 10);
  if (!Number.isFinite(partNumber) || partNumber <= 0) {
    return NextResponse.json({ error: "Invalid part number" }, { status: 400 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const verification = verifyUploadSessionPartToken(token, {
    sessionId,
    workspaceUuid: session.workspaceUuid,
    partNumber,
  });
  if (!verification.ok) {
    return NextResponse.json(
      { error: "Unauthorized", reason: verification.reason },
      { status: 401 }
    );
  }

  if (!request.body) {
    return NextResponse.json({ error: "Empty part payload" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof writeMultipartPart>>;
  try {
    result = await writeMultipartPart({
      sessionId,
      partNumber,
      maxBytes: resolveMaxPartBytes(),
      stream: request.body,
    });
  } catch (error) {
    if (
      (error as { code?: string } | null | undefined)?.code ===
      "UPLOAD_PART_TOO_LARGE"
    ) {
      void apiLogger.warn("upload.session.part.too_large", {
        durationMs: Date.now() - requestStartedAt,
        maxPartBytes: resolveMaxPartBytes(),
        partNumber,
        sessionId,
      });
      return NextResponse.json(
        { error: "Part too large", maxPartBytes: resolveMaxPartBytes() },
        { status: 413 }
      );
    }
    void apiLogger.requestFailed(500, error, {
      durationMs: Date.now() - requestStartedAt,
      partNumber,
      sessionId,
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
    sessionId,
    sizeBytes: result.sizeBytes,
  });

  return NextResponse.json({
    ok: true,
    etag: result.etag,
    partNumber: result.partNumber,
    sizeBytes: result.sizeBytes,
  });
}
