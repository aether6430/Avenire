import { resolveApiErrorMessage } from "@/lib/api-error-message";

import { z } from "zod";

const hashSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .refine((value) => /^[a-f0-9]{64}$/.test(value));

const itemSchema = z.object({
  clientUploadId: z.string().min(1).max(120),
  folderId: z.string().uuid(),
  hashSha256: hashSchema,
  mimeType: z.string().nullable().optional(),
  name: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

const requestSchema = z.object({
  files: z.array(itemSchema).min(1).max(200),
});

export const WORKSPACE_FILE_DEDUPE_LOOKUP_ERROR =
  "Unable to check for duplicate files.";

export type WorkspaceFileDedupeLookupRequest = z.infer<typeof requestSchema>;

interface WorkspaceFileDedupeLookupExistingFile {
  folderId: string;
  id: string;
  mimeType: string | null;
  name: string;
  sizeBytes: number;
  storageUrl: string;
}

export function resolveWorkspaceFileDedupeLookupRequest(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) {
    return null;
  }

  return parsed.data;
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
