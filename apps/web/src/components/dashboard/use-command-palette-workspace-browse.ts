"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useEffect, useMemo } from "react";
import type { WorkspaceSummary } from "@/components/dashboard/command-palette-model";
import { warmWorkspaceSurface } from "@/lib/dashboard-warmup";
import {
  buildWorkspaceBrowseCollectionFromIndexes,
  buildWorkspaceBrowseRecentItems,
  buildWorkspaceRetrievalSearchItems,
  type WorkspaceBrowseItem,
} from "@/lib/workspace-browse-model";
import {
  loadWorkspaceTreePayload,
  readCachedWorkspaceTreePayload,
} from "@/lib/workspace-tree-client";
import {
  type CommandPaletteWorkspaceIndex,
  commandPaletteActions,
} from "@/stores/commandPaletteStore";

type FileIndexByWorkspace = Record<string, CommandPaletteWorkspaceIndex>;
type RecentFileIdsByWorkspace = Record<string, string[]>;

async function hydrateWorkspaceIndex(workspace: WorkspaceSummary) {
  const cached = readCachedWorkspaceTreePayload<
    {
      id: string;
      name: string;
      parentId: string | null;
      readOnly?: boolean;
    },
    {
      folderId: string;
      id: string;
      name: string;
      readOnly?: boolean;
    }
  >(workspace.workspaceId);

  if (cached) {
    commandPaletteActions.setFileIndex({
      workspaceUuid: workspace.workspaceId,
      workspaceName: workspace.name,
      rootFolderId: workspace.rootFolderId,
      folders: cached.folders,
      files: cached.files,
    });
  }

  const payload = await loadWorkspaceTreePayload<
    {
      id: string;
      name: string;
      parentId: string | null;
      readOnly?: boolean;
    },
    {
      folderId: string;
      id: string;
      name: string;
      readOnly?: boolean;
    }
  >(workspace.workspaceId).catch(() => null);
  if (!payload) {
    return;
  }

  commandPaletteActions.setFileIndex({
    workspaceUuid: workspace.workspaceId,
    workspaceName: workspace.name,
    rootFolderId: workspace.rootFolderId,
    folders: payload.folders,
    files: payload.files,
  });
}

export interface CommandPaletteWorkspaceBrowseState {
  fileItems: WorkspaceBrowseItem[];
  folderItems: WorkspaceBrowseItem[];
  recentItems: WorkspaceBrowseItem[];
  retrievalSearchItems: ReturnType<typeof buildWorkspaceRetrievalSearchItems>;
  searchItems: WorkspaceBrowseItem[];
}

export function useCommandPaletteWorkspaceBrowse({
  activeFileId,
  currentFilesFolderId,
  currentFilesWorkspaceUuid,
  fileIndexByWorkspace,
  open,
  recentFileIdsByWorkspace,
  resolvedWorkspaceUuid,
  router,
  workspaces,
}: {
  activeFileId: string | null;
  currentFilesFolderId: string | null;
  currentFilesWorkspaceUuid: string | null;
  fileIndexByWorkspace: FileIndexByWorkspace;
  open: boolean;
  recentFileIdsByWorkspace: RecentFileIdsByWorkspace;
  resolvedWorkspaceUuid: string | null;
  router: AppRouterInstance;
  workspaces: WorkspaceSummary[];
}): CommandPaletteWorkspaceBrowseState {
  useEffect(() => {
    if (!(currentFilesWorkspaceUuid && activeFileId)) {
      return;
    }

    commandPaletteActions.recordRecentFile(
      currentFilesWorkspaceUuid,
      activeFileId
    );
  }, [activeFileId, currentFilesWorkspaceUuid]);

  useEffect(() => {
    if (!open) {
      return;
    }

    for (const workspace of workspaces) {
      const existingIndex = fileIndexByWorkspace[workspace.workspaceId];
      if (existingIndex?.files.length || existingIndex?.folders.length) {
        continue;
      }
      void hydrateWorkspaceIndex(workspace);
    }
  }, [fileIndexByWorkspace, open, workspaces]);

  const workspaceItems = useMemo(
    () =>
      buildWorkspaceBrowseCollectionFromIndexes({
        fileIndexByWorkspace,
        workspaces,
      }),
    [fileIndexByWorkspace, workspaces]
  );

  const fileItems = workspaceItems.files;
  const folderItems = workspaceItems.folders;
  const retrievalSearchItems = useMemo(
    () =>
      buildWorkspaceRetrievalSearchItems({
        fileItems,
        workspaceUuid: resolvedWorkspaceUuid,
      }),
    [fileItems, resolvedWorkspaceUuid]
  );

  const recentItems = useMemo(
    () =>
      buildWorkspaceBrowseRecentItems({
        fileItems,
        recentFileIdsByWorkspace,
        targetWorkspaceIds: resolvedWorkspaceUuid
          ? [resolvedWorkspaceUuid]
          : workspaces.map((workspace) => workspace.workspaceId),
      }),
    [fileItems, recentFileIdsByWorkspace, resolvedWorkspaceUuid, workspaces]
  );

  const searchItems = useMemo(
    () => [...fileItems, ...folderItems],
    [fileItems, folderItems]
  );

  useEffect(() => {
    if (!(open && resolvedWorkspaceUuid)) {
      return;
    }

    const currentWorkspace = workspaces.find(
      (entry) => entry.workspaceId === resolvedWorkspaceUuid
    );
    const targetRoute =
      currentFilesWorkspaceUuid === resolvedWorkspaceUuid &&
      currentFilesFolderId
        ? (`/workspace/files/${resolvedWorkspaceUuid}/folder/${currentFilesFolderId}` as const)
        : currentWorkspace?.rootFolderId
          ? (`/workspace/files/${resolvedWorkspaceUuid}/folder/${currentWorkspace.rootFolderId}` as const)
          : (`/workspace/files/${resolvedWorkspaceUuid}` as const);

    router.prefetch(targetRoute);
    warmWorkspaceSurface("files", {
      currentFolderId: currentFilesFolderId,
      rootFolderId: currentWorkspace?.rootFolderId ?? null,
      workspaceUuid: resolvedWorkspaceUuid,
    }).catch(() => undefined);
  }, [
    currentFilesFolderId,
    currentFilesWorkspaceUuid,
    open,
    resolvedWorkspaceUuid,
    router,
    workspaces,
  ]);

  return {
    fileItems,
    folderItems,
    recentItems,
    retrievalSearchItems,
    searchItems,
  };
}
