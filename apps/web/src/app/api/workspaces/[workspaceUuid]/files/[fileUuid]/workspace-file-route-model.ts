import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

import {
  normalizeFrontmatterProperties,
  normalizePageMetadataState,
} from "@/lib/frontmatter";

export const WORKSPACE_FILE_LOAD_ERROR = "Unable to load file.";
export const WORKSPACE_FILE_UPDATE_ERROR = "Unable to update file.";
export const WORKSPACE_FILE_DELETE_ERROR = "Unable to delete file.";

const pagePatchSchema = Schema.Struct({
  bannerUrl: Schema.optional(Schema.NullOr(Schema.String)),
  icon: Schema.optional(Schema.NullOr(Schema.String)),
  properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
});

export const workspaceFilePatchSchema = Schema.Struct({
  folderId: Schema.optional(Schema.String.check(Schema.isMinLength(1))),
  metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  name: Schema.optional(Schema.String.check(Schema.isMinLength(1))),
  page: Schema.optional(pagePatchSchema),
});

export type WorkspaceFilePatchBody = typeof workspaceFilePatchSchema.Type;

export function buildWorkspaceFileRouteSummary(file: {
  id: string;
  folderId: string | null;
  mimeType: string | null;
  name: string;
}) {
  return {
    file: {
      id: file.id,
      folderId: file.folderId,
      mimeType: file.mimeType ?? null,
      name: file.name,
    },
  };
}

export function resolveWorkspaceFileRoutePatchMetadata(input: {
  metadata?: Record<string, unknown>;
  page?:
    | {
        bannerUrl?: string | null;
        icon?: string | null;
        properties?: Record<string, unknown>;
      }
    | undefined;
}) {
  const nextPage =
    input.page === undefined
      ? undefined
      : normalizePageMetadataState({
          ...input.page,
          properties: normalizeFrontmatterProperties(input.page?.properties),
        });

  return input.metadata || nextPage !== undefined
    ? {
        ...(input.metadata ?? {}),
        ...(nextPage === undefined ? {} : { page: nextPage }),
      }
    : undefined;
}

export function resolveWorkspaceFileRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
