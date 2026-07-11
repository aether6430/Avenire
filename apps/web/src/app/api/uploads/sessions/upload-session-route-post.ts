import { NextResponse } from "next/server";
import {
  isFileMimeTypeConsistent,
  resolveFileMimeType,
} from "@avenire/ingestion/file-contract";
import { canStoreBytes } from "@/lib/billing";
import { userCanEditFolder } from "@/lib/file-data";
import { createApiLogger } from "@/lib/observability";
import { normalizeSha256 } from "@/lib/upload-registration";
import { createUploadSession } from "@/lib/upload-session-store";
import { ensureWorkspaceAccessForUser } from "@/lib/workspace";
import { parseJsonRequest } from "@/lib/api-request";
import {
  createUploadSessionSchema,
  resolveUploadSessionMaxPartBytes,
  resolveUploadSessionRouteError,
  UPLOAD_SESSION_CREATE_ERROR,
} from "./upload-session-route-model";

export async function handleUploadSessionsPost(input: {
  request: Request;
  userId: string;
}) {
  const apiLogger = createApiLogger({
    request: input.request,
    route: "/api/uploads/sessions",
    feature: "uploads",
    userId: input.userId,
  });
  apiLogger.requestStarted();

  const parsed = await parseJsonRequest(input.request, createUploadSessionSchema);
  if (!parsed.success) {
    apiLogger.requestFailed(400, "Invalid payload");
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (
    !isFileMimeTypeConsistent({
      declaredMimeType: parsed.data.mimeType,
      name: parsed.data.name,
    })
  ) {
    apiLogger.requestFailed(415, "Unsupported or inconsistent MIME type");
    return NextResponse.json(
      { error: "Unsupported or inconsistent MIME type" },
      { status: 415 }
    );
  }

  const mimeType = resolveFileMimeType({
    declaredMimeType: parsed.data.mimeType,
    name: parsed.data.name,
  });

  try {
    const canAccess = await ensureWorkspaceAccessForUser(
      input.userId,
      parsed.data.workspaceUuid
    );
    if (!canAccess) {
      apiLogger.requestFailed(403, "Forbidden", {
        workspaceUuid: parsed.data.workspaceUuid,
      });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const canEdit = await userCanEditFolder({
      workspaceId: parsed.data.workspaceUuid,
      folderId: parsed.data.folderId,
      userId: input.userId,
    });
    if (!canEdit) {
      apiLogger.requestFailed(403, "Read-only folder");
      return NextResponse.json({ error: "Read-only folder" }, { status: 403 });
    }

    const storage = await canStoreBytes(input.userId, parsed.data.sizeBytes);
    if (!storage.ok) {
      apiLogger.requestFailed(429, "Storage limit reached", {
        folderId: parsed.data.folderId,
        limitBytes: storage.limitBytes,
        requestedBytes: parsed.data.sizeBytes,
        usedBytes: storage.usedBytes,
        workspaceUuid: parsed.data.workspaceUuid,
      });
      return NextResponse.json(
        {
          error: "Storage limit reached",
          limitBytes: storage.limitBytes,
          usedBytes: storage.usedBytes,
        },
        { status: 429 }
      );
    }

    const session = await createUploadSession({
      userId: input.userId,
      workspaceUuid: parsed.data.workspaceUuid,
      folderId: parsed.data.folderId,
      name: parsed.data.name.trim(),
      mimeType,
      sizeBytes: parsed.data.sizeBytes,
      checksumSha256: normalizeSha256(parsed.data.checksumSha256),
    });

    apiLogger.requestSucceeded(201, {
      workspaceUuid: session.workspaceUuid,
      sessionId: session.id,
      folderId: session.folderId,
    });

    return NextResponse.json(
      {
        session,
        multipart: {
          recommendedPartSizeBytes: resolveUploadSessionMaxPartBytes(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    apiLogger.requestFailed(500, error, {
      folderId: parsed.data.folderId,
      workspaceUuid: parsed.data.workspaceUuid,
    });
    return NextResponse.json(
      {
        error: resolveUploadSessionRouteError(
          error,
          UPLOAD_SESSION_CREATE_ERROR
        ),
      },
      { status: 500 }
    );
  }
}
