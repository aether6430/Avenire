"use client";

import { useRouter } from "next/navigation";
import type { WorkspaceSummary } from "@/components/dashboard/command-palette-model";
import { useCommandPaletteData } from "@/components/dashboard/use-command-palette-data";
import { useCommandPaletteNavigation } from "@/components/dashboard/use-command-palette-navigation";
import { useCommandPaletteSearch } from "@/components/dashboard/use-command-palette-search";
import { useCommandPaletteShell } from "@/components/dashboard/use-command-palette-shell";
import { useCommandPaletteStore } from "@/stores/commandPaletteStore";

export function useCommandPalette({
  workspaceUuid: activeWorkspaceUuid,
  workspaces = [],
}: {
  workspaceUuid?: string;
  workspaces?: WorkspaceSummary[];
}) {
  const router = useRouter();
  const open = useCommandPaletteStore((state) => state.open);
  const workspaceUuid = useCommandPaletteStore((state) => state.workspaceUuid);
  const fileIndexByWorkspace = useCommandPaletteStore(
    (state) => state.fileIndexByWorkspace
  );
  const recentFileIdsByWorkspace = useCommandPaletteStore(
    (state) => state.recentFileIdsByWorkspace
  );

  const shell = useCommandPaletteShell({
    activeWorkspaceUuid,
    open,
    workspaceUuid,
  });

  const data = useCommandPaletteData({
    activeFileId: shell.activeFileId,
    currentFilesFolderId: shell.currentFilesFolderId,
    currentFilesWorkspaceUuid: shell.currentFilesWorkspaceUuid,
    fileIndexByWorkspace,
    open: shell.open,
    recentFileIdsByWorkspace,
    resolvedWorkspaceUuid: shell.resolvedWorkspaceUuid,
    router,
    workspaces,
  });

  const navigation = useCommandPaletteNavigation({
    currentFilesFolderId: shell.currentFilesFolderId,
    currentFilesWorkspaceUuid: shell.currentFilesWorkspaceUuid,
    currentRoute: shell.currentRoute,
    resolvedWorkspaceUuid: shell.resolvedWorkspaceUuid,
    router,
    setPendingRoute: shell.setPendingRoute,
    workspaces,
  });

  const search = useCommandPaletteSearch({
    cachedChats: data.cachedChats,
    cachedFlashcardSets: data.cachedFlashcardSets,
    commandItems: navigation.commandItems,
    open: shell.open,
    resolvedWorkspaceUuid: shell.resolvedWorkspaceUuid,
    retrievalSearchItems: data.retrievalSearchItems,
    searchItems: data.searchItems,
    searchQuery: shell.searchQuery,
  });

  return {
    open: shell.open,
    query: shell.query,
    searchQuery: shell.searchQuery,
    pendingRoute: shell.pendingRoute,
    filteredCommands: search.filteredCommands,
    hasCommandMatches: search.hasCommandMatches,
    chatResults: search.chatResults,
    flashcardResults: search.flashcardResults,
    fuzzyResults: search.fuzzyResults,
    retrievalResults: search.retrievalResults,
    retrievalError: search.retrievalError,
    isRetrieving: search.isRetrieving,
    workspaceTasksErrorMessage: data.workspaceTasksErrorMessage,
    workspaceTasksLoadFailed: data.workspaceTasksLoadFailed,
    workspaceTasks: data.workspaceTasks,
    recentItems: data.recentItems,
    recentChats: data.recentChats,
    recentFlashcardSets: data.recentFlashcardSets,
    hasWorkspaceSearchContext: search.hasWorkspaceSearchContext,
    setQuery: shell.setQuery,
    handleDialogOpenChange: shell.handleDialogOpenChange,
    handleOpenFolder: navigation.handleOpenFolder,
    handleOpenFile: navigation.handleOpenFile,
    openSearchResult: navigation.openSearchResult,
    openChatRoute: navigation.openChatRoute,
    openFlashcardRoute: navigation.openFlashcardRoute,
    openTaskRoute: navigation.openTaskRoute,
  };
}
