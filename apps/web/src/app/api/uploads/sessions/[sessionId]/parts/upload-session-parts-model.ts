import { z } from "zod";

export { resolveUploadSessionMaxPartBytes } from "../../upload-session-route-model";

export const uploadSessionPartsSchema = z.object({
  partNumbers: z.array(z.number().int().positive()).min(1).max(10_000),
});

export function isUploadSessionExpired(expiresAt: string, nowMs = Date.now()) {
  return new Date(expiresAt).getTime() <= nowMs;
}

export function parseUploadSessionPartNumber(partNumberRaw: string) {
  const partNumber = Number.parseInt(partNumberRaw, 10);
  if (!Number.isFinite(partNumber) || partNumber <= 0) {
    return null;
  }
  return partNumber;
}

export function buildUploadSessionPartUploadUrl(input: {
  origin: string;
  partNumber: number;
  sessionId: string;
  token: string;
}) {
  const uploadUrl = new URL(
    `/api/uploads/sessions/${input.sessionId}/parts/${input.partNumber}`,
    input.origin
  );
  uploadUrl.searchParams.set("token", input.token);
  return uploadUrl.toString();
}
