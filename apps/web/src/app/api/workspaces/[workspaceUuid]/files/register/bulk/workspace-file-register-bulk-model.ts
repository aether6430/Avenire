import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

const workspaceFileRegisterBulkBaseFileFields = {
  clientUploadId: Schema.String.check(Schema.isLengthBetween(1, 120)),
  folderId: Schema.String.check(Schema.isUUID()),
  name: Schema.String.check(Schema.isMinLength(1)),
  mimeType: Schema.optional(Schema.NullOr(Schema.String)),
  sizeBytes: Schema.optional(
    Schema.Number.check(Schema.isInt(), Schema.isGreaterThanOrEqualTo(0))
  ),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  contentHashSha256: Schema.optional(
    Schema.String.check(Schema.isPattern(/^[a-fA-F0-9]{64}$/))
  ),
  hashComputedBy: Schema.optional(Schema.Literals(["client", "server"])),
};

const workspaceFileRegisterBulkUploadedFileSchema = Schema.Struct({
  ...workspaceFileRegisterBulkBaseFileFields,
  content: Schema.optional(Schema.Undefined),
  sizeBytes: Schema.Number.check(
    Schema.isInt(),
    Schema.isGreaterThanOrEqualTo(0)
  ),
  storageKey: Schema.String.check(Schema.isMinLength(1)),
  storageUrl: Schema.String.check(Schema.isPattern(/^https?:\/\//)),
});

const workspaceFileRegisterBulkNoteFileSchema = Schema.Struct({
  ...workspaceFileRegisterBulkBaseFileFields,
  content: Schema.String,
  storageKey: Schema.optional(Schema.Undefined),
  storageUrl: Schema.optional(Schema.Undefined),
});

export const workspaceFileRegisterBulkFileSchema = Schema.Union([
  workspaceFileRegisterBulkUploadedFileSchema,
  workspaceFileRegisterBulkNoteFileSchema,
]);

export const workspaceFileRegisterBulkRequestSchema = Schema.Struct({
  dedupeMode: Schema.optional(Schema.Literals(["allow", "skip"])),
  files: Schema.Array(workspaceFileRegisterBulkFileSchema).check(
    Schema.isLengthBetween(1, 200)
  ),
});

export const WORKSPACE_FILE_REGISTER_BULK_ERROR = "Bulk registration failed";

export type WorkspaceFileRegisterBulkFile =
  typeof workspaceFileRegisterBulkFileSchema.Type;
export type WorkspaceFileRegisterBulkRequest =
  typeof workspaceFileRegisterBulkRequestSchema.Type;
export type WorkspaceFileRegisterBulkNoteFile =
  typeof workspaceFileRegisterBulkNoteFileSchema.Type;
export type WorkspaceFileRegisterBulkUploadedFile =
  typeof workspaceFileRegisterBulkUploadedFileSchema.Type;

export interface WorkspaceFileRegisterBulkResult {
  clientUploadId: string;
  error?: string;
  file?: {
    id: string;
  };
  ingestionJob?: {
    id?: string;
  } | null;
  status: "ok" | "failed";
}

export function isWorkspaceFileRegisterBulkNotePayload(
  file: WorkspaceFileRegisterBulkFile
): file is WorkspaceFileRegisterBulkNoteFile {
  return typeof file.content === "string";
}

export function isWorkspaceFileRegisterBulkUploadPayload(
  file: WorkspaceFileRegisterBulkFile
): file is WorkspaceFileRegisterBulkUploadedFile {
  return (
    typeof file.storageKey === "string" &&
    typeof file.storageUrl === "string" &&
    typeof file.sizeBytes === "number"
  );
}

export function countSuccessfulWorkspaceFileRegisterBulkResults(
  results: WorkspaceFileRegisterBulkResult[]
) {
  return results.filter((result) => result.status === "ok").length;
}

export function buildWorkspaceFileRegisterBulkSummary(
  results: WorkspaceFileRegisterBulkResult[]
) {
  const succeeded = countSuccessfulWorkspaceFileRegisterBulkResults(results);

  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
  };
}

export function resolveWorkspaceFileRegisterBulkRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
