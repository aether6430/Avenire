"use client";

import {
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { PushPin as Pin } from "@phosphor-icons/react";
import type { Route } from "next";
import type { MouseEvent } from "react";
import { setWorkspacePaneDragData } from "@/lib/workspace-panes";
import type { PinnedExplorerItem } from "@/stores/filesPinsStore";

function buildPinnedFolderHref(item: PinnedExplorerItem) {
  return `/workspace/files/${item.workspaceId}/folder/${item.id}` as Route;
}

function buildPinnedFileHref(item: PinnedExplorerItem) {
  if (!item.folderId) {
    return null;
  }

  return `/workspace/files/${item.workspaceId}/folder/${item.folderId}?file=${item.id}` as Route;
}

function PinnedSidebarItemButton({
  dragHref,
  label,
  onClick,
  onContextMenu,
}: {
  dragHref?: Route | null;
  label: string;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        draggable={Boolean(dragHref)}
        onClick={onClick}
        onContextMenu={onContextMenu}
        onDragStart={(event) => {
          if (!dragHref) {
            return;
          }

          setWorkspacePaneDragData(event.dataTransfer, dragHref);
        }}
      >
        <Pin className="size-4" />
        <span className="truncate">{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarFilesPanelPinnedSection({
  handlePaneIntent,
  navigateToFile,
  navigateToFolder,
  pinnedFiles,
  pinnedFolders,
  workspaceUuid,
}: {
  handlePaneIntent: (event: MouseEvent<HTMLElement>, href: Route) => boolean;
  navigateToFile: (
    fileId: string,
    folderId: string,
    routeWorkspaceUuid: string
  ) => void;
  navigateToFolder: (folderId: string, routeWorkspaceUuid: string) => void;
  pinnedFiles: PinnedExplorerItem[];
  pinnedFolders: PinnedExplorerItem[];
  workspaceUuid: string | null;
}) {
  if (
    !workspaceUuid ||
    (pinnedFolders.length === 0 && pinnedFiles.length === 0)
  ) {
    return null;
  }

  return (
    <>
      <SidebarGroupLabel>Pinned</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {pinnedFolders.map((item) => {
            const href = buildPinnedFolderHref(item);
            return (
              <PinnedSidebarItemButton
                dragHref={href}
                key={`pinned-folder-${item.id}`}
                label={item.name}
                onClick={(event) => {
                  if (handlePaneIntent(event, href)) {
                    return;
                  }
                  navigateToFolder(item.id, item.workspaceId);
                }}
                onContextMenu={(event) => {
                  handlePaneIntent(event, href);
                }}
              />
            );
          })}
          {pinnedFiles.map((item) => {
            const href = buildPinnedFileHref(item);
            return (
              <PinnedSidebarItemButton
                dragHref={href}
                key={`pinned-file-${item.id}`}
                label={item.name}
                onClick={(event) => {
                  if (!(href && item.folderId)) {
                    return;
                  }
                  if (handlePaneIntent(event, href)) {
                    return;
                  }
                  navigateToFile(item.id, item.folderId, item.workspaceId);
                }}
                onContextMenu={(event) => {
                  if (!href) {
                    return;
                  }
                  handlePaneIntent(event, href);
                }}
              />
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </>
  );
}
