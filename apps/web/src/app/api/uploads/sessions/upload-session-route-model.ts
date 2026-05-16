import { z } from "zod";

export const createUploadSessionSchema = z.object({
  workspaceUuid: z.string().uuid(),
  folderId: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative(),
  checksumSha256: z.string().optional(),
});

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
