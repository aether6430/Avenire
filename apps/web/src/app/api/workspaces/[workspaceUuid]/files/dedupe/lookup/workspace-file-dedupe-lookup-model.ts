import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

const hashSchema = Schema.Trim.check(Schema.isPattern(/^[a-fA-F0-9]{64}$/));

const itemSchema = Schema.Struct({
  clientUploadId: Schema.String.check(Schema.isLengthBetween(1, 120)),
  folderId: Schema.String.check(Schema.isUUID()),
  hashSha256: hashSchema,
  mimeType: Schema.optional(Schema.NullOr(Schema.String)),
  name: Schema.String.check(Schema.isMinLength(1)),
  sizeBytes: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0)
  ),
});

export const workspaceFileDedupeLookupRequestSchema = Schema.Struct({
  files: Schema.Array(itemSchema).check(Schema.isLengthBetween(1, 200)),
});

export const WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR =
  "Unable to check for duplicate files.";

export type WorkspaceFileDedupeLookupRequest =
  typeof workspaceFileDedupeLookupRequestSchema.Type;

interface WorkspaceFileDedupeLookupExistingFile {
  folderId: string;
  id: string;
  mimeType: string | null;
  name: string;
  sizeBytes: number;
  storageUrl: string;
}

export function normalizeWorkspaceFileDedupeLookupRequest(
  input: WorkspaceFileDedupeLookupRequest
) {
  return {
    files: input.files.map((file) => ({
      ...file,
      hashSha256: file.hashSha256.toLowerCase(),
    })),
  };
}

export function buildWorkspaceFileDedupeLookupResult(input: {
  clientUploadId: string;
  existing: WorkspaceFileDedupeLookupExistingFile | null;
}) {
  if (!input.existing) {
    return {
      clientUploadId: input.clientUploadId,
      deduped: false as const,
    };
  }

  return {
    clientUploadId: input.clientUploadId,
    deduped: true as const,
    file: {
      id: input.existing.id,
      folderId: input.existing.folderId,
      name: input.existing.name,
      storageUrl: input.existing.storageUrl,
      mimeType: input.existing.mimeType ?? null,
      sizeBytes: input.existing.sizeBytes,
    },
  };
}

export function resolveWorkspaceFileDedupeLookupRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
