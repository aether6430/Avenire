"use client";

interface CachedWorkspaceTreePayload {
  cachedAt: number;
  files: unknown[];
  folders: unknown[];
}

const CACHE_PREFIX = "avenire-workspace-tree-cache:v1:";

function cacheKey(workspaceUuid: string) {
  return `${CACHE_PREFIX}${workspaceUuid}`;
}

function isAnyArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function readWorkspaceTreeCache<TFolder, TFile>(
  workspaceUuid: string
): { cachedAt: number; files: TFile[]; folders: TFolder[] } | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(cacheKey(workspaceUuid));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<CachedWorkspaceTreePayload>;
    if (
      typeof parsed.cachedAt !== "number" ||
      !isAnyArray(parsed.folders) ||
      !isAnyArray(parsed.files)
    ) {
      return null;
    }

    return {
      cachedAt: parsed.cachedAt,
      files: parsed.files as TFile[],
      folders: parsed.folders as TFolder[],
    };
  } catch {
    return null;
  }
}

export function writeWorkspaceTreeCache<TFolder, TFile>(
  workspaceUuid: string,
  payload: { files: TFile[]; folders: TFolder[] }
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      cacheKey(workspaceUuid),
      JSON.stringify({
        cachedAt: Date.now(),
        files: payload.files,
        folders: payload.folders,
      } satisfies CachedWorkspaceTreePayload)
    );
  } catch {
    // Ignore cache write errors.
  }
}
