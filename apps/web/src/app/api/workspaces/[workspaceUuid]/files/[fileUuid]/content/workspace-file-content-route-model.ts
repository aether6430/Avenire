import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

import {
  normalizePageMetadataState,
  type PageMetadataState,
} from "@/lib/frontmatter";

export interface WorkspaceFileContentRouteBody {
  content?: string;
  mimeType?: string | null;
  page?: {
    bannerUrl?: string | null;
    icon?: string | null;
    properties?: Record<string, unknown>;
  };
  sizeBytes?: number;
  storageKey?: string;
  storageUrl?: string;
}

export const workspaceFileContentPatchSchema = Schema.Struct({
  content: Schema.optional(Schema.String),
  mimeType: Schema.optional(Schema.NullOr(Schema.String)),
  page: Schema.optional(Schema.Struct({
    bannerUrl: Schema.optional(Schema.NullOr(Schema.String)),
    icon: Schema.optional(Schema.NullOr(Schema.String)),
    properties: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  })),
  sizeBytes: Schema.optional(Schema.Number.check(Schema.isFinite(), Schema.isGreaterThanOrEqualTo(0))),
  storageKey: Schema.optional(Schema.String),
  storageUrl: Schema.optional(Schema.String),
});

export const WORKSPACE_FILE_CONTENT_ERROR = "Unable to replace file content.";

export interface ResolvedWorkspaceFileContentRouteBody {
  content: string | null;
  mimeType: string | null;
  nextPage: PageMetadataState | undefined;
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
}

export function resolveWorkspaceFileContentRouteBody(
  body: WorkspaceFileContentRouteBody
): ResolvedWorkspaceFileContentRouteBody {
  return {
    content: typeof body.content === "string" ? body.content : null,
    mimeType: typeof body.mimeType === "string" ? body.mimeType : null,
    nextPage:
      body.page === undefined
        ? undefined
        : normalizePageMetadataState(body.page),
    sizeBytes: Number(body.sizeBytes),
    storageKey: String(body.storageKey ?? "").trim(),
    storageUrl: String(body.storageUrl ?? "").trim(),
  };
}

export function isValidWorkspaceFileBinaryReplacement(input: {
  sizeBytes: number;
  storageKey: string;
  storageUrl: string;
}) {
  return (
    Boolean(input.storageKey) &&
    Boolean(input.storageUrl) &&
    Number.isFinite(input.sizeBytes) &&
    input.sizeBytes >= 0
  );
}

export function resolveWorkspaceFileContentRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
