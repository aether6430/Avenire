import { resolveApiErrorMessage } from "@/lib/api-error-message";

import { z } from "zod";

export const createUploadSessionSchema = z.object({
  workspaceUuid: z.string().uuid(),
  folderId: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative(),
  checksumSha256: z.string().optional(),
});

export const UPLOAD_SESSION_CREATE_ERROR = "Unable to create upload session.";
export const UPLOAD_SESSION_LOAD_ERROR = "Unable to load upload session.";
export const UPLOAD_SESSION_PARTS_ERROR = "Unable to create upload part URLs.";

export function resolveUploadSessionMaxPartBytes() {
  const parsed = Number.parseInt(
    process.env.UPLOAD_SESSION_MAX_PART_BYTES ?? "",
    10
  );
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 16 * 1024 * 1024;
  }
  return parsed;
}

export function resolveUploadSessionRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
