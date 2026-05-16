"use client";

import { useCallback } from "react";
import {
  collectSidebarDeletedFolderIds,
  filterSidebarTreeAfterDelete,
  isSidebarFolderDescendant,
  type SidebarFileNode,
  type SidebarFolderNode,
  type SidebarTreeMutationItem,
} from "@/components/dashboard/sidebar-files-panel-model";
import { writeWorkspaceTreePayload } from "@/lib/workspace-tree-client";
import { filesUiActions } from "@/stores/filesUiStore";

export function useSidebarFilesPanelMutations({
  currentFileId,
  currentFolderId,
  fileTree,
  folderTree,
  navigateToFilesRoot,
  setFileTree,
  setFolderTree,
  workspaceUuid,
}: {
  currentFileId?: string;
  currentFolderId?: string;
  fileTree: SidebarFileNode[];
  folderTree: SidebarFolderNode[];
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  setFileTree: React.Dispatch<React.SetStateAction<SidebarFileNode[]>>;
  setFolderTree: React.Dispatch<React.SetStateAction<SidebarFolderNode[]>>;
  workspaceUuid: string | null;
}) {
  const moveTreeItem = useCallback(
    async (item: SidebarTreeMutationItem, targetFolderId: string) => {
      if (!workspaceUuid) {
        return;
      }

      const targetFolder = folderTree.find(
        (folder) => folder.id === targetFolderId
      );
      if (targetFolder?.readOnly) {
        return;
      }

      if (item.kind === "folder") {
        const sourceFolder = folderTree.find((folder) => folder.id === item.id);
        if (sourceFolder?.readOnly) {
          return;
        }
        if (
          item.id === targetFolderId ||
          isSidebarFolderDescendant(folderTree, item.id, targetFolderId)
        ) {
          return;
        }
        await fetch(`/api/workspaces/${workspaceUuid}/folders/${item.id}`, {
          body: JSON.stringify({ parentId: targetFolderId }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
      } else {
        const sourceFile = fileTree.find((file) => file.id === item.id);
        if (sourceFile?.readOnly) {
          return;
        }
        await fetch(`/api/workspaces/${workspaceUuid}/files/${item.id}`, {
          body: JSON.stringify({ folderId: targetFolderId }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH",
        });
      }

      if (item.kind === "folder") {
        setFolderTree((previous) => {
          const next = previous.map((folder) =>
            folder.id === item.id
              ? { ...folder, parentId: targetFolderId }
              : folder
          );
          writeWorkspaceTreePayload(workspaceUuid, {
            files: fileTree,
            folders: next,
          });
          return next;
        });
      } else {
        setFileTree((previous) => {
          const next = previous.map((file) =>
            file.id === item.id ? { ...file, folderId: targetFolderId } : file
          );
          writeWorkspaceTreePayload(workspaceUuid, {
            files: next,
            folders: folderTree,
          });
          return next;
        });
      }

      filesUiActions.emitSync(workspaceUuid);
    },
    [fileTree, folderTree, setFileTree, setFolderTree, workspaceUuid]
  );

  const deleteTreeItems = useCallback(
    async (items: SidebarTreeMutationItem[]) => {
      if (!(workspaceUuid && items.length > 0)) {
        return;
      }

      const response = await fetch(
        `/api/workspaces/${workspaceUuid}/items/bulk`,
        {
          body: JSON.stringify({
            items,
            operation: "delete",
          }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        }
      );

      if (!response.ok) {
        return;
      }

      if (
        items.some(
          (item) =>
            (item.kind === "file" && item.id === currentFileId) ||
            (item.kind === "folder" && item.id === currentFolderId)
        )
      ) {
        await navigateToFilesRoot();
      }

      const folderIdsToRemove = collectSidebarDeletedFolderIds(
        folderTree,
        items
      );
      const nextTreeState = filterSidebarTreeAfterDelete({
        fileTree,
        folderIdsToRemove,
        folderTree,
        items,
      });

      setFolderTree(nextTreeState.folders);
      setFileTree(nextTreeState.files);
      writeWorkspaceTreePayload(workspaceUuid, nextTreeState);
      filesUiActions.emitSync(workspaceUuid);
    },
    [
      currentFileId,
      currentFolderId,
      fileTree,
      folderTree,
      navigateToFilesRoot,
      setFileTree,
      setFolderTree,
      workspaceUuid,
    ]
  );

  const handleTreeMoveItem = useCallback(
    (draggedItemId: string, targetItemId: string) => {
      const draggedFolder = folderTree.find(
        (item) => item.id === draggedItemId
      );
      if (draggedFolder) {
        moveTreeItem({ id: draggedItemId, kind: "folder" }, targetItemId).catch(
          () => undefined
        );
        return;
      }

      const draggedFile = fileTree.find((item) => item.id === draggedItemId);
      if (draggedFile) {
        moveTreeItem({ id: draggedItemId, kind: "file" }, targetItemId).catch(
          () => undefined
        );
      }
    },
    [fileTree, folderTree, moveTreeItem]
  );

  return {
    deleteTreeItems,
    handleTreeMoveItem,
  };
}
