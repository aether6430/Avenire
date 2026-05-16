import { z } from "zod";

const workspaceFileRegisterBulkBaseFileSchema = z.object({
  clientUploadId: z.string().min(1).max(120),
  folderId: z.string().uuid(),
  name: z.string().min(1),
  mimeType: z.string().nullable().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  contentHashSha256: z
    .string()
    .regex(/^[a-fA-F0-9]{64}$/)
    .optional(),
  hashComputedBy: z.enum(["client", "server"]).optional(),
});

const workspaceFileRegisterBulkUploadedFileSchema =
  workspaceFileRegisterBulkBaseFileSchema.extend({
    content: z.undefined().optional(),
    sizeBytes: z.number().int().nonnegative(),
    storageKey: z.string().min(1),
    storageUrl: z.string().url(),
  });

const workspaceFileRegisterBulkNoteFileSchema =
  workspaceFileRegisterBulkBaseFileSchema.extend({
    content: z.string(),
    storageKey: z.undefined().optional(),
    storageUrl: z.undefined().optional(),
  });

export const workspaceFileRegisterBulkFileSchema = z.union([
  workspaceFileRegisterBulkUploadedFileSchema,
  workspaceFileRegisterBulkNoteFileSchema,
]);

export const workspaceFileRegisterBulkRequestSchema = z.object({
  dedupeMode: z.enum(["allow", "skip"]).optional(),
  files: z.array(workspaceFileRegisterBulkFileSchema).min(1).max(200),
});

export type WorkspaceFileRegisterBulkFile = z.infer<
  typeof workspaceFileRegisterBulkFileSchema
>;
export type WorkspaceFileRegisterBulkRequest = z.infer<
  typeof workspaceFileRegisterBulkRequestSchema
>;
export type WorkspaceFileRegisterBulkNoteFile = z.infer<
  typeof workspaceFileRegisterBulkNoteFileSchema
>;
export type WorkspaceFileRegisterBulkUploadedFile = z.infer<
  typeof workspaceFileRegisterBulkUploadedFileSchema
>;

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
