"use client";

import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import {
  type Dispatch,
  type SetStateAction,
  startTransition,
  useCallback,
} from "react";
import type { WorkspaceSummary } from "@/components/dashboard/command-palette-model";
import {
  buildCommandPaletteFileTargetRoute,
  resolveCommandPaletteWorkspaceFilesRoute,
  shouldReplaceCommandPaletteFileRoute,
} from "@/components/dashboard/command-palette-model";
import type { WorkspaceSearchResult } from "@/components/files/search-model";
import type { WorkspaceBrowseItem } from "@/lib/workspace-browse-model";
import { commandPaletteActions } from "@/stores/commandPaletteStore";
import { filesUiActions } from "@/stores/filesUiStore";

export function useCommandPaletteFileActions({
  currentFilesFolderId,
  currentFilesWorkspaceUuid,
  currentRoute,
  resolvedWorkspaceUuid,
  router,
  setPendingRoute,
  workspaces,
}: {
  currentFilesFolderId: string | null;
  currentFilesWorkspaceUuid: string | null;
  currentRoute: string;
  resolvedWorkspaceUuid: string | null;
  router: AppRouterInstance;
  setPendingRoute: Dispatch<SetStateAction<string | null>>;
  workspaces: WorkspaceSummary[];
}) {
  const openFilesRoute = useCallback(() => {
    const targetRoute = resolveCommandPaletteWorkspaceFilesRoute({
      workspaceId: resolvedWorkspaceUuid,
      workspaces,
    }) as Route;

    router.prefetch(targetRoute);
    setPendingRoute(targetRoute);

    startTransition(() => {
      if (currentRoute === targetRoute) {
        commandPaletteActions.close();
        return;
      }

      router.push(targetRoute);
    });
  }, [
    currentRoute,
    resolvedWorkspaceUuid,
    router,
    setPendingRoute,
    workspaces,
  ]);

  const handleFileIntent = useCallback(
    (intent: Parameters<typeof filesUiActions.emitIntent>[0]) => {
      filesUiActions.emitIntent(intent);
      openFilesRoute();
    },
    [openFilesRoute]
  );

  const handleOpenFolder = useCallback(
    (item: WorkspaceBrowseItem) => {
      const targetRoute =
        `/workspace/files/${item.workspaceUuid}/folder/${item.id}` as Route;
      router.prefetch(targetRoute);
      setPendingRoute(targetRoute);

      startTransition(() => {
        router.push(targetRoute);
      });
    },
    [router, setPendingRoute]
  );

  const handleOpenFile = useCallback(
    (
      workspaceId: string,
      fileId: string,
      folderId: string | undefined,
      options?: { retrievalChunkId?: string | null }
    ) => {
      commandPaletteActions.recordRecentFile(workspaceId, fileId);

      if (!folderId) {
        const fallbackRoute = resolveCommandPaletteWorkspaceFilesRoute({
          workspaceId,
          workspaces,
        }) as Route;
        router.prefetch(fallbackRoute);
        setPendingRoute(fallbackRoute);
        startTransition(() => {
          router.push(fallbackRoute);
        });
        return;
      }

      const targetRoute = buildCommandPaletteFileTargetRoute({
        fileId,
        folderId,
        retrievalChunkId: options?.retrievalChunkId ?? null,
        workspaceId,
      }) as Route;
      router.prefetch(targetRoute);
      setPendingRoute(targetRoute);

      startTransition(() => {
        if (
          shouldReplaceCommandPaletteFileRoute({
            currentFilesFolderId,
            currentFilesWorkspaceUuid,
            folderId,
            workspaceId,
          })
        ) {
          router.replace(targetRoute);
        } else {
          router.push(targetRoute);
        }
      });
    },
    [
      currentFilesFolderId,
      currentFilesWorkspaceUuid,
      router,
      setPendingRoute,
      workspaces,
    ]
  );

  const openSearchResult = useCallback(
    (result: WorkspaceSearchResult) => {
      const targetWorkspaceUuid = result.workspaceUuid ?? resolvedWorkspaceUuid;
      if (!targetWorkspaceUuid) {
        return;
      }

      const targetFileId = result.fileId ?? result.id;
      const targetFolderId =
        result.folderId ?? currentFilesFolderId ?? undefined;

      handleOpenFile(targetWorkspaceUuid, targetFileId, targetFolderId, {
        retrievalChunkId: result.chunkId ?? null,
      });
    },
    [currentFilesFolderId, handleOpenFile, resolvedWorkspaceUuid]
  );

  return {
    handleFileIntent,
    handleOpenFile,
    handleOpenFolder,
    openFilesRoute,
    openSearchResult,
  };
}
