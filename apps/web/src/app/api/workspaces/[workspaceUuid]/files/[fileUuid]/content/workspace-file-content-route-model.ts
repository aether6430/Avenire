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
