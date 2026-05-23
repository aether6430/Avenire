"use client";

import type { Route } from "next";
import { useCallback } from "react";
import {
  buildExplorerFileRoute,
  buildExplorerFolderRoute,
  resolveExplorerFileTargetFolderId,
} from "@/components/files/explorer/explorer-navigation-model";
import type { FileRecord } from "@/components/files/explorer/shared";
import type { WorkspaceSearchResult } from "@/components/files/search-model";

interface ExplorerNavigationRouter {
  prefetch: (href: Route) => void;
  push: (href: Route) => void;
  replace: (href: Route) => void;
}

interface ExplorerNavigationSearchParams {
  toString(): string;
}

interface UseExplorerNavigationOptions {
  allFiles: FileRecord[];
  currentFolderId: string;
  router: ExplorerNavigationRouter;
  searchParams: ExplorerNavigationSearchParams;
  workspaceUuid: string;
}

export function useExplorerNavigation({
  allFiles,
  currentFolderId,
  router,
  searchParams,
  workspaceUuid,
}: UseExplorerNavigationOptions) {
  const openWorkspaceFileInFolder = useCallback(
    (folderId: string, fileId: string) => {
      if (!workspaceUuid) {
        return;
      }

      router.push(
        buildExplorerFileRoute({
          fileId,
          folderId,
          workspaceUuid,
        }) as Route
      );
    },
    [router, workspaceUuid]
  );

  const navigateToFolder = useCallback(
    (folderId: string) => {
      if (!workspaceUuid) {
        return;
      }

      const route = buildExplorerFolderRoute({
        folderId,
        workspaceUuid,
      }) as Route;
      router.prefetch(route);
      router.push(route);
    },
    [router, workspaceUuid]
  );

  const selectFile = useCallback(
    (
      fileId: string | null,
      options?: {
        retrievalChunkId?: string | null;
      }
    ) => {
      if (!(workspaceUuid && currentFolderId)) {
        return;
      }

      const targetRoute = buildExplorerFileRoute({
        baseSearchParams: searchParams.toString(),
        fileId,
        folderId: currentFolderId,
        retrievalChunkId: options?.retrievalChunkId,
        workspaceUuid,
      }) as Route;

      router.prefetch(targetRoute);
      router.replace(targetRoute);
    },
    [currentFolderId, router, searchParams, workspaceUuid]
  );

  const openSearchResult = useCallback(
    (result: WorkspaceSearchResult) => {
      if (!(workspaceUuid && currentFolderId)) {
        return;
      }

      const targetFileId = result.fileId ?? result.id;
      const targetFolderId = resolveExplorerFileTargetFolderId(
        allFiles,
        targetFileId,
        currentFolderId
      );

      const targetRoute = buildExplorerFileRoute({
        fileId: targetFileId,
        folderId: targetFolderId,
        retrievalChunkId: result.chunkId ?? undefined,
        workspaceUuid,
      }) as Route;
      router.prefetch(targetRoute);
      router.push(targetRoute);
    },
    [allFiles, currentFolderId, router, workspaceUuid]
  );

  const openFileById = useCallback(
    (fileId: string) => {
      if (!workspaceUuid) {
        return;
      }

      const targetFolderId = resolveExplorerFileTargetFolderId(
        allFiles,
        fileId,
        currentFolderId
      );
      const targetRoute = buildExplorerFileRoute({
        fileId,
        folderId: targetFolderId,
        workspaceUuid,
      }) as Route;

      router.prefetch(targetRoute);
      router.push(targetRoute);
    },
    [allFiles, currentFolderId, router, workspaceUuid]
  );

  const openFolderById = useCallback(
    (folderId: string) => {
      navigateToFolder(folderId);
    },
    [navigateToFolder]
  );

  return {
    navigateToFolder,
    openFileById,
    openFolderById,
    openSearchResult,
    openWorkspaceFileInFolder,
    selectFile,
  };
}
