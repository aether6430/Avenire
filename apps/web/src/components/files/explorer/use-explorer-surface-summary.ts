"use client";

import { useMemo } from "react";
import {
  buildExplorerCurrentInfoEntries,
  buildExplorerCurrentPinnedItem,
  buildExplorerFolderFileCount,
  buildExplorerFolderPreviewKinds,
  buildExplorerFolderSubfolderCount,
  buildExplorerIsCurrentPinned,
  buildExplorerWorkspaceMemberNameById,
} from "@/components/files/explorer/explorer-surface-summary-model";
import type {
  FileRecord,
  FolderRecord,
  WorkspaceMemberRecord,
} from "@/components/files/explorer/shared";
import type { PinnedExplorerItem } from "@/stores/filesPinsStore";

interface UseExplorerSurfaceSummaryOptions {
  activeFile: FileRecord | null;
  allFiles: FileRecord[];
  allFolders: FolderRecord[];
  currentFolder: FolderRecord | null;
  currentLocationTitle: string;
  detectFileKind: (file: FileRecord) => string;
  filePathById: Map<string, string>;
  isAtWorkspaceRoot: boolean;
  pinnedItems: PinnedExplorerItem[];
  workspaceMembers: WorkspaceMemberRecord[];
  workspaceUuid: string;
}

export function useExplorerSurfaceSummary({
  activeFile,
  allFiles,
  allFolders,
  currentFolder,
  currentLocationTitle,
  detectFileKind,
  filePathById,
  isAtWorkspaceRoot,
  pinnedItems,
  workspaceMembers,
  workspaceUuid,
}: UseExplorerSurfaceSummaryOptions) {
  const currentPinnedItem = useMemo(
    () =>
      buildExplorerCurrentPinnedItem({
        activeFile,
        currentFolder,
        workspaceUuid,
      }),
    [activeFile, currentFolder, workspaceUuid]
  );

  const isCurrentPinned = useMemo(
    () => buildExplorerIsCurrentPinned(pinnedItems, currentPinnedItem),
    [currentPinnedItem, pinnedItems]
  );

  const folderSubfolderCount = useMemo(
    () => buildExplorerFolderSubfolderCount(allFolders),
    [allFolders]
  );

  const folderFileCount = useMemo(
    () => buildExplorerFolderFileCount(allFiles),
    [allFiles]
  );

  const folderPreviewKinds = useMemo(
    () => buildExplorerFolderPreviewKinds(allFiles, detectFileKind),
    [allFiles, detectFileKind]
  );

  const workspaceMemberNameById = useMemo(
    () => buildExplorerWorkspaceMemberNameById(workspaceMembers),
    [workspaceMembers]
  );

  const currentInfoEntries = useMemo(
    () =>
      buildExplorerCurrentInfoEntries({
        activeFile,
        currentFolder,
        currentLocationTitle,
        filePathById,
        isAtWorkspaceRoot,
        workspaceMemberCount: workspaceMembers.length,
        workspaceMemberNameById,
      }),
    [
      activeFile,
      currentFolder,
      currentLocationTitle,
      filePathById,
      isAtWorkspaceRoot,
      workspaceMemberNameById,
      workspaceMembers.length,
    ]
  );

  return {
    currentInfoEntries,
    currentPinnedItem,
    folderFileCount,
    folderPreviewKinds,
    folderSubfolderCount,
    isCurrentPinned,
    workspaceMemberNameById,
  };
}
