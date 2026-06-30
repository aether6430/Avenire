import { resolveApiErrorMessage } from "@/lib/api-error-message";

import { extractMarkdownNotePageMetadata } from "@/lib/markdown-note-page-metadata";

export interface WorkspaceFileRegisterBody {
  content?: string;
  contentHashSha256?: string | null;
  folderId?: string;
  hashComputedBy?: "client" | "server" | null;
  metadata?: Record<string, unknown>;
  mimeType?: string | null;
  name?: string;
  sizeBytes?: number;
  storageKey?: string;
  storageUrl?: string;
}

export interface WorkspaceFileRegisterLogger {
  featureUsed: (event: string, properties?: Record<string, unknown>) => unknown;
  meter: (event: string, properties?: Record<string, unknown>) => unknown;
  rateLimited: (
    bucket: string,
    retryAfter?: string | null,
    properties?: Record<string, unknown>
  ) => unknown;
  requestFailed: (
    statusCode: number,
    error: unknown,
    properties?: Record<string, unknown>
  ) => unknown;
  requestSucceeded: (
    statusCode: number,
    properties?: Record<string, unknown>
  ) => unknown;
}

export const WORKSPACE_FILE_REGISTER_ERROR = "Failed to register file";

export function resolveWorkspaceFileRegisterRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}

export function classifyStoredFileType(mimeType: string | null) {
  if (!mimeType) {
    return "unknown";
  }

  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  if (mimeType === "application/pdf") {
    return "pdf";
  }
  if (
    mimeType === "application/msword" ||
    mimeType === "application/rtf" ||
    mimeType === "application/vnd.ms-excel" ||
    mimeType === "application/vnd.ms-powerpoint" ||
    mimeType === "application/vnd.oasis.opendocument.database" ||
    mimeType === "application/vnd.oasis.opendocument.formula" ||
    mimeType === "application/vnd.oasis.opendocument.graphics" ||
    mimeType === "application/vnd.oasis.opendocument.graphics-template" ||
    mimeType === "application/vnd.oasis.opendocument.presentation" ||
    mimeType === "application/vnd.oasis.opendocument.presentation-template" ||
    mimeType === "application/vnd.oasis.opendocument.spreadsheet" ||
    mimeType === "application/vnd.oasis.opendocument.spreadsheet-template" ||
    mimeType === "application/vnd.oasis.opendocument.text" ||
    mimeType === "application/vnd.oasis.opendocument.text-master" ||
    mimeType === "application/vnd.oasis.opendocument.text-template" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "text/csv"
  ) {
    return "document";
  }
  if (mimeType.startsWith("text/")) {
    return "text";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  return "other";
}

export function resolveWorkspaceFileRegisterMetadata(
  metadata: Record<string, unknown> | undefined,
  content: string
) {
  const nextMetadata = {
    ...(metadata ?? {}),
  };

  const templatePage = extractMarkdownNotePageMetadata(content);
  const currentPage =
    nextMetadata.page &&
    typeof nextMetadata.page === "object" &&
    !Array.isArray(nextMetadata.page)
      ? (nextMetadata.page as Record<string, unknown>)
      : null;

  if (templatePage || currentPage) {
    nextMetadata.page = {
      ...(currentPage ?? {}),
      ...(templatePage ?? {}),
      properties: {
        ...(((currentPage?.properties as Record<string, unknown> | undefined) ??
          {}) as Record<string, unknown>),
        ...(templatePage?.properties ?? {}),
      },
    };
  }

  return nextMetadata;
}

export function isWorkspaceFileRegisterNotePayload(
  body: WorkspaceFileRegisterBody
): body is WorkspaceFileRegisterBody & {
  content: string;
  folderId: string;
  name: string;
} {
  return (
    typeof body.folderId === "string" &&
    typeof body.content === "string" &&
    typeof body.name === "string"
  );
}

export function isWorkspaceFileRegisterUploadPayload(
  body: WorkspaceFileRegisterBody
): body is WorkspaceFileRegisterBody & {
  folderId: string;
  name: string;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
} {
  return (
    typeof body.folderId === "string" &&
    typeof body.storageKey === "string" &&
    typeof body.storageUrl === "string" &&
    typeof body.name === "string" &&
    typeof body.sizeBytes === "number"
  );
}
