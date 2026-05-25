"use client";

import { Button } from "@avenire/ui/components/button";
import {
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@avenire/ui/components/sidebar";
import { cn } from "@avenire/ui/lib/utils";
import { Files, Trash as Trash2 } from "@phosphor-icons/react";
import { FilePlus as FilePlus2 } from "@phosphor-icons/react/FilePlus";
import type { Route } from "next";
import Image from "next/image";
import type { ComponentType } from "react";
import { useMemo } from "react";
import type {
  SidebarFileNode,
  SidebarFolderNode,
} from "@/components/dashboard/sidebar-files-panel-model";
import type { TreeDataItem } from "../ui/tree-view";
import { TreeView } from "../ui/tree-view";
import { SectionButton } from "./dashboard-sidebar-shared";
import { getSidebarTreeFileIconSrc } from "./sidebar-files-panel-tree-model";

const treeFileIconComponentCache = new Map<
  string,
  ComponentType<{ className?: string }>
>();

function TreeIconImage({
  alt,
  className,
  src,
}: {
  alt: string;
  className?: string;
  src: string;
}) {
  return (
    <Image
      alt={alt}
      aria-hidden="true"
      className={className}
      height={16}
      src={src}
      unoptimized
      width={16}
    />
  );
}

function TreeFolderClosedIcon({ className }: { className?: string }) {
  return (
    <TreeIconImage alt="" className={className} src="/icons/_folder.svg" />
  );
}

function TreeFolderOpenIcon({ className }: { className?: string }) {
  return (
    <TreeIconImage alt="" className={className} src="/icons/_folder_open.svg" />
  );
}

function getTreeFileIconComponent(name: string) {
  const iconSrc = getSidebarTreeFileIconSrc(name);
  const cached = treeFileIconComponentCache.get(iconSrc);
  if (cached) {
    return cached;
  }

  const TreeFileIcon = ({ className }: { className?: string }) => (
    <TreeIconImage
      alt=""
      className={cn("size-4 shrink-0", className)}
      src={iconSrc}
    />
  );
  TreeFileIcon.displayName = `TreeFileIcon(${iconSrc})`;
  treeFileIconComponentCache.set(iconSrc, TreeFileIcon);
  return TreeFileIcon;
}

export function SidebarFilesPanelTreeSection({
  deleteTreeItems,
  expandedTreePathIds,
  fileTree,
  label,
  folderTree,
  handlePaneIntent,
  handleTreeMoveItem,
  navigateToFile,
  navigateToFilesRoot,
  navigateToFolder,
  onExpandedChange,
  openFileInNewPane,
  openFolderInNewPane,
  selectedItemId,
  uploadFile,
  workspaceUuid,
}: {
  deleteTreeItems: (
    items: Array<{ id: string; kind: "file" | "folder" }>
  ) => Promise<void>;
  expandedTreePathIds: string[];
  fileTree: SidebarFileNode[];
  label?: string | null;
  folderTree: SidebarFolderNode[];
  handlePaneIntent: (
    event: React.MouseEvent<HTMLElement>,
    href: Route
  ) => boolean;
  handleTreeMoveItem: (draggedItemId: string, targetItemId: string) => void;
  navigateToFile: (
    fileId: string,
    folderId: string,
    routeWorkspaceUuid: string
  ) => void;
  navigateToFilesRoot: (options?: { openInNewPane?: boolean }) => Promise<void>;
  navigateToFolder: (folderId: string, routeWorkspaceUuid: string) => void;
  onExpandedChange: (itemIds: string[]) => void;
  openFileInNewPane: (
    fileId: string,
    folderId: string,
    routeWorkspaceUuid: string
  ) => void;
  openFolderInNewPane: (folderId: string, routeWorkspaceUuid: string) => void;
  selectedItemId?: string;
  uploadFile: () => void;
  workspaceUuid: string | null;
}) {
  const sidebarTreeData = useMemo<TreeDataItem[]>(() => {
    if (!workspaceUuid) {
      return [];
    }

    const childrenByFolderId = new Map<string | null, TreeDataItem[]>();
    const addChild = (parentId: string | null, item: TreeDataItem) => {
      const existing = childrenByFolderId.get(parentId) ?? [];
      existing.push(item);
      childrenByFolderId.set(parentId, existing);
    };

    for (const folder of [...folderTree].sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      const folderItem: TreeDataItem = {
        actions: (
          <>
            {folder.readOnly ? null : (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  navigateToFolder(folder.id, workspaceUuid);
                  uploadFile();
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <FilePlus2 className="size-3.5" />
                <span className="sr-only">Upload file</span>
              </Button>
            )}
            {folder.readOnly ? null : (
              <Button
                onClick={(event) => {
                  event.stopPropagation();
                  deleteTreeItems([{ id: folder.id, kind: "folder" }]).catch(
                    () => undefined
                  );
                }}
                size="icon-xs"
                type="button"
                variant="ghost"
              >
                <Trash2 className="size-3.5" />
                <span className="sr-only">Delete folder</span>
              </Button>
            )}
          </>
        ),
        draggable: !folder.readOnly,
        droppable: !folder.readOnly,
        icon: TreeFolderClosedIcon,
        id: folder.id,
        name: folder.name,
        onClick: () => {
          navigateToFolder(folder.id, workspaceUuid);
        },
        onContextMenu: () => {
          openFolderInNewPane(folder.id, workspaceUuid);
        },
        openIcon: TreeFolderOpenIcon,
        selectedIcon: TreeFolderOpenIcon,
      };
      addChild(folder.parentId, folderItem);
    }

    for (const file of [...fileTree].sort((a, b) =>
      a.name.localeCompare(b.name)
    )) {
      addChild(file.folderId, {
        actions: file.readOnly ? null : (
          <Button
            onClick={(event) => {
              event.stopPropagation();
              deleteTreeItems([{ id: file.id, kind: "file" }]).catch(
                () => undefined
              );
            }}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Trash2 className="size-3.5" />
            <span className="sr-only">Delete file</span>
          </Button>
        ),
        draggable: !file.readOnly,
        icon: getTreeFileIconComponent(file.name),
        id: file.id,
        name: file.name,
        onClick: () => {
          navigateToFile(file.id, file.folderId, workspaceUuid);
        },
        onContextMenu: () => {
          openFileInNewPane(file.id, file.folderId, workspaceUuid);
        },
      });
    }

    const attachChildren = (parentId: string | null): TreeDataItem[] =>
      (childrenByFolderId.get(parentId) ?? []).map((item) => ({
        ...item,
        children: attachChildren(item.id),
      }));

    return attachChildren(null);
  }, [
    deleteTreeItems,
    fileTree,
    folderTree,
    navigateToFile,
    navigateToFolder,
    openFileInNewPane,
    openFolderInNewPane,
    uploadFile,
    workspaceUuid,
  ]);

  return (
    <>
      <SidebarGroupLabel>Your Files</SidebarGroupLabel>
      <SidebarGroupContent className="min-h-0">
        {workspaceUuid && folderTree.length > 0 ? (
          <div className="h-full min-w-0 pr-1">
            <TreeView
              className="h-full min-w-0 overflow-y-auto rounded-xl"
              data={sidebarTreeData}
              expandedItemIds={expandedTreePathIds}
              onExpandedChange={onExpandedChange}
              onMoveItem={handleTreeMoveItem}
              selectedItemId={selectedItemId}
            />
          </div>
        ) : (
          <div className="space-y-1">
            <SectionButton
              dragHref={"/workspace/files" as Route}
              icon={Files}
              label={label ?? "Workspace"}
              onClick={(event) => {
                if (handlePaneIntent(event, "/workspace/files" as Route)) {
                  return;
                }
                navigateToFilesRoot().catch(() => undefined);
              }}
              onContextMenu={(event) => {
                handlePaneIntent(event, "/workspace/files" as Route);
              }}
            />
          </div>
        )}
      </SidebarGroupContent>
    </>
  );
}
