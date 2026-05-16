"use client";

import {
  readWorkspaceTreeCache,
  writeWorkspaceTreeCache,
} from "@/lib/workspace-tree-cache";

export interface WorkspaceTreeFolderLike {
  id: string;
  name: string;
  parentId: string | null;
  readOnly?: boolean;
}

export interface WorkspaceTreeFileLike {
  folderId: string;
  id: string;
  name: string;
  readOnly?: boolean;
}

export interface WorkspaceTreePayload<
  TFolder extends WorkspaceTreeFolderLike = WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike = WorkspaceTreeFileLike,
> {
  files: TFile[];
  folders: TFolder[];
}

const inFlightTreeLoads = new Map<
  string,
  Promise<WorkspaceTreePayload | null>
>();

function withInFlightDeduplication<T>(
  store: Map<string, Promise<T>>,
  key: string,
  load: () => Promise<T>
) {
  const existing = store.get(key);
  if (existing) {
    return existing;
  }

  const next = load().finally(() => {
    store.delete(key);
  });
  store.set(key, next);
  return next;
}

function normalizeWorkspaceTreePayload<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(payload: Partial<WorkspaceTreePayload<TFolder, TFile>> | null | undefined) {
  return {
    files: payload?.files ?? [],
    folders: payload?.folders ?? [],
  } satisfies WorkspaceTreePayload<TFolder, TFile>;
}

export function readCachedWorkspaceTreePayload<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(workspaceUuid: string): WorkspaceTreePayload<TFolder, TFile> | null {
  const cached = readWorkspaceTreeCache<TFolder, TFile>(workspaceUuid);
  if (!cached) {
    return null;
  }

  return {
    files: cached.files,
    folders: cached.folders,
  };
}

export function writeWorkspaceTreePayload<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(workspaceUuid: string, payload: WorkspaceTreePayload<TFolder, TFile>) {
  writeWorkspaceTreeCache(workspaceUuid, payload);
}

export async function loadWorkspaceTreePayload<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(workspaceUuid: string): Promise<WorkspaceTreePayload<TFolder, TFile> | null> {
  return withInFlightDeduplication(
    inFlightTreeLoads,
    workspaceUuid,
    async () => {
      const response = await fetch(`/api/workspaces/${workspaceUuid}/tree`, {
        cache: "no-store",
      });

      if (!response.ok) {
        return null;
      }

      const payload = normalizeWorkspaceTreePayload<TFolder, TFile>(
        (await response.json()) as Partial<WorkspaceTreePayload<TFolder, TFile>>
      );
      writeWorkspaceTreePayload(workspaceUuid, payload);
      return payload;
    }
  ) as Promise<WorkspaceTreePayload<TFolder, TFile> | null>;
}

export async function getWorkspaceTreePayload<
  TFolder extends WorkspaceTreeFolderLike,
  TFile extends WorkspaceTreeFileLike,
>(
  workspaceUuid: string,
  options?: { preferCache?: boolean }
): Promise<WorkspaceTreePayload<TFolder, TFile> | null> {
  if (options?.preferCache) {
    const cached = readCachedWorkspaceTreePayload<TFolder, TFile>(
      workspaceUuid
    );
    if (cached) {
      return cached;
    }
  }

  return loadWorkspaceTreePayload<TFolder, TFile>(workspaceUuid);
}
