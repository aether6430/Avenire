"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useMemo } from "react";
import type { WorkspaceSummary } from "@/components/dashboard/command-palette-model";
import { useCommandPaletteWorkspaceBrowse } from "@/components/dashboard/use-command-palette-workspace-browse";
import { useCommandPaletteWorkspaceTasks } from "@/components/dashboard/use-command-palette-workspace-tasks";
import type { ChatSummary } from "@/lib/chat-data";
import {
  readCachedChats,
  readCachedFlashcardSets,
} from "@/lib/dashboard-browser-cache";
import type { FlashcardSetSummary } from "@/lib/flashcards";
import type { CommandPaletteWorkspaceIndex } from "@/stores/commandPaletteStore";

type FileIndexByWorkspace = Record<string, CommandPaletteWorkspaceIndex>;

type RecentFileIdsByWorkspace = Record<string, string[]>;

export interface CommandPaletteDataState {
  cachedChats: ChatSummary[];
  cachedFlashcardSets: FlashcardSetSummary[];
  fileItems: ReturnType<typeof useCommandPaletteWorkspaceBrowse>["fileItems"];
  folderItems: ReturnType<
    typeof useCommandPaletteWorkspaceBrowse
  >["folderItems"];
  recentChats: ChatSummary[];
  recentFlashcardSets: FlashcardSetSummary[];
  recentItems: ReturnType<
    typeof useCommandPaletteWorkspaceBrowse
  >["recentItems"];
  retrievalSearchItems: ReturnType<
    typeof useCommandPaletteWorkspaceBrowse
  >["retrievalSearchItems"];
  searchItems: ReturnType<
    typeof useCommandPaletteWorkspaceBrowse
  >["searchItems"];
  workspaceTasks: ReturnType<
    typeof useCommandPaletteWorkspaceTasks
  >["workspaceTasks"];
  workspaceTasksErrorMessage: ReturnType<
    typeof useCommandPaletteWorkspaceTasks
  >["workspaceTasksErrorMessage"];
  workspaceTasksLoadFailed: ReturnType<
    typeof useCommandPaletteWorkspaceTasks
  >["workspaceTasksLoadFailed"];
}

export function useCommandPaletteData({
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
}): CommandPaletteDataState {
  const workspaceBrowse = useCommandPaletteWorkspaceBrowse({
    activeFileId,
    currentFilesFolderId,
    currentFilesWorkspaceUuid,
    fileIndexByWorkspace,
    open,
    recentFileIdsByWorkspace,
    resolvedWorkspaceUuid,
    router,
    workspaces,
  });
  const {
    fileItems,
    folderItems,
    recentItems,
    retrievalSearchItems,
    searchItems,
  } = workspaceBrowse;
  const taskState = useCommandPaletteWorkspaceTasks({
    open,
    resolvedWorkspaceUuid,
  });
  const {
    workspaceTasks,
    workspaceTasksErrorMessage,
    workspaceTasksLoadFailed,
  } = taskState;

  const cachedChats = useMemo<ChatSummary[]>(
    () =>
      resolvedWorkspaceUuid
        ? (readCachedChats(resolvedWorkspaceUuid) ?? [])
        : [],
    [resolvedWorkspaceUuid]
  );

  const cachedFlashcardSets = useMemo<FlashcardSetSummary[]>(
    () =>
      resolvedWorkspaceUuid
        ? (readCachedFlashcardSets(resolvedWorkspaceUuid) ?? [])
        : [],
    [resolvedWorkspaceUuid]
  );

  const recentChats = useMemo(
    () =>
      cachedChats
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 6),
    [cachedChats]
  );

  const recentFlashcardSets = useMemo(
    () =>
      cachedFlashcardSets
        .slice()
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 6),
    [cachedFlashcardSets]
  );

  return {
    cachedChats,
    cachedFlashcardSets,
    fileItems,
    folderItems,
    recentChats,
    recentFlashcardSets,
    recentItems,
    retrievalSearchItems,
    searchItems,
    workspaceTasks,
    workspaceTasksErrorMessage,
    workspaceTasksLoadFailed,
  };
}
