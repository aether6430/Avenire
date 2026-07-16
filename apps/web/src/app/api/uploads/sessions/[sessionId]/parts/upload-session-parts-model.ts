import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { Schema } from "effect-v4";

export { resolveUploadSessionMaxPartBytes } from "../../upload-session-route-model";
export const UPLOAD_SESSION_PART_UPLOAD_ERROR = "Unable to upload part.";

export const uploadSessionPartsSchema = Schema.Struct({
  partNumbers: Schema.Array(
    Schema.Number.check(Schema.isInt(), Schema.isGreaterThan(0))
  ).check(Schema.isLengthBetween(1, 10_000)),
});

export function isUploadSessionExpired(expiresAt: string, nowMs = Date.now()) {
  return new Date(expiresAt).getTime() <= nowMs;
}

export function parseUploadSessionPartNumber(partNumberRaw: string) {
  const partNumber = Number.parseInt(partNumberRaw, 10);
  return Number.isFinite(partNumber) && partNumber > 0 ? partNumber : null;
}

export function buildUploadSessionPartUploadUrl(input: { origin: string; partNumber: number; sessionId: string; token: string }) {
  const uploadUrl = new URL(`/api/uploads/sessions/${input.sessionId}/parts/${input.partNumber}`, input.origin);
  uploadUrl.searchParams.set("token", input.token);
  return uploadUrl.toString();
}

export function resolveUploadSessionPartRouteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}
