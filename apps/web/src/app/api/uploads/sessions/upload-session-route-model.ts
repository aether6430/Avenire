import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { Schema } from "effect-v4";

const uuid = Schema.String.check(Schema.isUUID(4));

export const createUploadSessionSchema = Schema.Struct({
  workspaceUuid: uuid,
  folderId: uuid,
  name: Schema.String.check(Schema.isLengthBetween(1, 255)),
  mimeType: Schema.optional(Schema.NullOr(Schema.String)),
  sizeBytes: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThan(0)
  ),
  checksumSha256: Schema.optional(Schema.String),
});

export const UPLOAD_SESSION_CREATE_ERROR = "Unable to create upload session.";
export const UPLOAD_SESSION_LOAD_ERROR = "Unable to load upload session.";
export const UPLOAD_SESSION_PARTS_ERROR = "Unable to create upload part URLs.";

export function resolveUploadSessionMaxPartBytes() {
  const parsed = Number.parseInt(process.env.UPLOAD_SESSION_MAX_PART_BYTES ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 16 * 1024 * 1024;
}

export function resolveUploadSessionRouteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}
