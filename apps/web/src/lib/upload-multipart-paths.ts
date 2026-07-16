import { tmpdir } from "node:os";
import { join } from "node:path";

export const MULTIPART_ROOT_DIR =
  process.env.UPLOAD_SESSION_PARTS_DIR ??
  join(tmpdir(), "avenire-upload-session-parts");

export function toSafeSessionSegment(sessionId: string) {
  return sessionId.replace(/[^a-zA-Z0-9-_]/g, "_");
}

export function toSafePartNumber(partNumber: number) {
  return Math.max(1, Math.trunc(partNumber));
}

export function getSessionDirectory(sessionId: string) {
  return join(MULTIPART_ROOT_DIR, toSafeSessionSegment(sessionId));
}

export function getPartPath(sessionId: string, partNumber: number) {
  const safePartNumber = toSafePartNumber(partNumber);
  return join(getSessionDirectory(sessionId), `${safePartNumber}.part`);
}

export function getProviderObjectMarkerPath(sessionId: string) {
  return join(getSessionDirectory(sessionId), ".provider-object-key");
}
