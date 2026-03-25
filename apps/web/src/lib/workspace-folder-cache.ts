"use client";

import {
  readBrowserCache,
  removeBrowserCache,
  writeBrowserCache,
} from "@/lib/browser-cache";

const MAX_FOLDER_CACHE_ENTRIES = 80;

interface CachedWorkspaceFolderPayload<TFolder, TFile> {
  ancestors: TFolder[];
  cachedAt: number;
  files: TFile[];
  folders: TFolder[];
}

const folderPayloadByKey = new Map<
  string,
  CachedWorkspaceFolderPayload<unknown, unknown>
>();
const CACHE_PREFIX = "avenire-workspace-folder-cache:v1:";

function cacheKey(workspaceUuid: string, folderId: string) {
  return `${CACHE_PREFIX}${workspaceUuid}:${folderId}`;
}

function pruneFolderCache() {
  while (folderPayloadByKey.size > MAX_FOLDER_CACHE_ENTRIES) {
    const oldest = folderPayloadByKey.keys().next().value;
    if (!oldest) {
      return;
    }
    folderPayloadByKey.delete(oldest);
  }
}

export function readWorkspaceFolderCache<TFolder, TFile>(
  workspaceUuid: string,
  folderId: string
): CachedWorkspaceFolderPayload<TFolder, TFile> | null {
  const key = cacheKey(workspaceUuid, folderId);
  const cached = folderPayloadByKey.get(key);
  if (cached) {
    return {
      ancestors: cached.ancestors as TFolder[],
      cachedAt: cached.cachedAt,
      files: cached.files as TFile[],
      folders: cached.folders as TFolder[],
    };
  }

  const persisted = readBrowserCache(
    key,
    (value): value is CachedWorkspaceFolderPayload<TFolder, TFile> =>
      Boolean(
        value &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          typeof (value as { cachedAt?: unknown }).cachedAt === "number" &&
          Array.isArray((value as { ancestors?: unknown }).ancestors) &&
          Array.isArray((value as { files?: unknown }).files) &&
          Array.isArray((value as { folders?: unknown }).folders)
      )
  );

  if (!persisted) {
    return null;
  }

  folderPayloadByKey.set(key, persisted);
  return {
    ancestors: persisted.ancestors,
    cachedAt: persisted.cachedAt,
    files: persisted.files,
    folders: persisted.folders,
  };
}

export function writeWorkspaceFolderCache<TFolder, TFile>(
  workspaceUuid: string,
  folderId: string,
  payload: {
    ancestors: TFolder[];
    files: TFile[];
    folders: TFolder[];
  }
) {
  const key = cacheKey(workspaceUuid, folderId);
  const next = {
    ancestors: payload.ancestors,
    cachedAt: Date.now(),
    files: payload.files,
    folders: payload.folders,
  } satisfies CachedWorkspaceFolderPayload<TFolder, TFile>;

  folderPayloadByKey.set(key, next);
  writeBrowserCache(key, next);
  pruneFolderCache();
}

export function invalidateWorkspaceFolderCache(
  workspaceUuid: string,
  folderId?: string | null
) {
  if (folderId) {
    const key = cacheKey(workspaceUuid, folderId);
    folderPayloadByKey.delete(key);
    removeBrowserCache(key);
    return;
  }

  const prefix = `${CACHE_PREFIX}${workspaceUuid}:`;
  for (const key of folderPayloadByKey.keys()) {
    if (key.startsWith(prefix)) {
      folderPayloadByKey.delete(key);
      removeBrowserCache(key);
    }
  }
}
