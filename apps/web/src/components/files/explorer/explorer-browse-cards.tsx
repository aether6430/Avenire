"use client";

import {
  ExplorerFileCard,
  ExplorerFolderCard,
} from "@/components/files/explorer/explorer-cards";
import type { ExplorerBrowseSurfaceProps } from "./explorer-browse-surface-types";
import { buildSelectionControlCaptureProps } from "./explorer-browse-surface-types";

export function ExplorerBrowseCards({
  allFolders,
  contextMenuSurfaceClass,
  dropTargetId,
  folderFileCount,
  folderPreviewKinds,
  folderSubfolderCount,
  getFileDragProps,
  getFileIcon,
  getFileItemActionProps,
  getFileKind,
  getFolderDragProps,
  getFolderItemActionProps,
  hoveredPreviewFileId,
  interactions,
  isMobile,
  itemActionTargetSelector,
  onChangeFolderBanner,
  onCreateFolderHere,
  onOpenFile,
  onOpenFolder,
  onPreviewIntentEnd,
  onPreviewIntentStart,
  onResetFolderBanner,
  selectedCardPropertyDefinitions,
  selection,
  setItemRowRef,
  sortedFiles,
  sortedFolders,
  viewMode,
  visibleItemIds,
}: Pick<
  ExplorerBrowseSurfaceProps,
  | "allFolders"
  | "contextMenuSurfaceClass"
  | "dropTargetId"
  | "folderFileCount"
  | "folderPreviewKinds"
  | "folderSubfolderCount"
  | "getFileDragProps"
  | "getFileIcon"
  | "getFileItemActionProps"
  | "getFileKind"
  | "getFolderDragProps"
  | "getFolderItemActionProps"
  | "hoveredPreviewFileId"
  | "interactions"
  | "isMobile"
  | "itemActionTargetSelector"
  | "onChangeFolderBanner"
  | "onCreateFolderHere"
  | "onOpenFile"
  | "onOpenFolder"
  | "onPreviewIntentEnd"
  | "onPreviewIntentStart"
  | "onResetFolderBanner"
  | "selectedCardPropertyDefinitions"
  | "selection"
  | "setItemRowRef"
  | "sortedFiles"
  | "sortedFolders"
  | "viewMode"
  | "visibleItemIds"
>) {
  const selectionControlCaptureProps =
    buildSelectionControlCaptureProps(interactions);

  const handleSelectableItemClick = (
    event: React.MouseEvent<HTMLDivElement>,
    itemId: string,
    openItem: () => void
  ) => {
    if (interactions.shouldIgnoreItemClick(event)) {
      return;
    }
    if (isMobile) {
      interactions.handleMobileItemClick(itemId, openItem);
      return;
    }
    selection.handleItemClick(event, itemId, visibleItemIds);
    interactions.handleOpenOnDoubleClick(event, openItem);
  };

  const handleItemPointerDown =
    (itemId: string): React.PointerEventHandler<HTMLDivElement> =>
    (event) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest(itemActionTargetSelector)) {
        return;
      }
      if (isMobile && event.pointerType === "touch") {
        interactions.beginMobileItemLongPress(itemId);
      }
    };

  const getItemRowRef = (itemId: string) => (node: HTMLDivElement | null) => {
    setItemRowRef(itemId, node);
  };

  return (
    <div
      className={`flex flex-wrap gap-3 ${viewMode !== "cards" ? "hidden" : ""}`}
    >
      {sortedFolders.map((folder) => {
        const counts = {
          fileCount: folderFileCount.get(folder.id) ?? 0,
          folderCount: folderSubfolderCount.get(folder.id) ?? 0,
        };
        const folderActionProps = getFolderItemActionProps(folder, counts);

        return (
          <ExplorerFolderCard
            allFolders={allFolders}
            contextMenuSurfaceClass={contextMenuSurfaceClass}
            dragProps={getFolderDragProps(folder.id, folder.readOnly)}
            folder={folder}
            isDropTarget={dropTargetId === folder.id}
            isMobile={isMobile}
            isSelected={selection.selectedIds.has(folder.id)}
            key={folder.id}
            onChangeBanner={() => onChangeFolderBanner(folder.id)}
            onClick={(event) => {
              handleSelectableItemClick(event, folder.id, () =>
                onOpenFolder(folder.id)
              );
            }}
            onContextMenu={(event) =>
              interactions.handleItemContextMenu(event, folder.id)
            }
            onCreateFolderHere={() => onCreateFolderHere(folder.id)}
            onDelete={folderActionProps.onDelete}
            onDownload={folderActionProps.onDownload}
            onDuplicate={folderActionProps.onDuplicate}
            onMoveToFolder={folderActionProps.onMoveTo}
            onOpen={() => onOpenFolder(folder.id)}
            onOpenProperties={folderActionProps.onOpenProperties}
            onPointerCancel={interactions.handleMobileItemPointerUp}
            onPointerDown={handleItemPointerDown(folder.id)}
            onPointerUp={interactions.handleMobileItemPointerUp}
            onRename={folderActionProps.onRename}
            onResetBanner={() => onResetFolderBanner(folder.id)}
            onShare={folderActionProps.onShare}
            onToggleSelected={() => selection.toggleSelection(folder.id)}
            previewKinds={folderPreviewKinds.get(folder.id) ?? []}
            rowRef={getItemRowRef(folder.id)}
            selectionControlCaptureProps={selectionControlCaptureProps}
          />
        );
      })}

      {sortedFiles.map((file) => {
        const fileKind = getFileKind(file);
        const fileActionProps = getFileItemActionProps(file);

        return (
          <ExplorerFileCard
            allFolders={allFolders}
            contextMenuSurfaceClass={contextMenuSurfaceClass}
            displayName={file.name}
            dragProps={getFileDragProps(file.id, file.readOnly)}
            file={file}
            fileType={fileKind}
            isMobile={isMobile}
            isPreviewing={hoveredPreviewFileId === file.id}
            isSelected={selection.selectedIds.has(file.id)}
            key={file.id}
            onBlur={() => onPreviewIntentEnd(file)}
            onClick={(event) => {
              handleSelectableItemClick(event, file.id, () =>
                onOpenFile(file.id)
              );
            }}
            onContextMenu={(event) =>
              interactions.handleItemContextMenu(event, file.id)
            }
            onDelete={fileActionProps.onDelete}
            onDownload={fileActionProps.onDownload}
            onDuplicate={fileActionProps.onDuplicate}
            onFocus={() => onPreviewIntentStart(file)}
            onHardReingest={fileActionProps.onHardReingest ?? (() => {})}
            onMouseEnter={() => onPreviewIntentStart(file)}
            onMouseLeave={() => onPreviewIntentEnd(file)}
            onMoveToFolder={fileActionProps.onMoveTo}
            onOpen={() => onOpenFile(file.id)}
            onOpenProperties={fileActionProps.onOpenProperties}
            onPointerCancel={interactions.handleMobileItemPointerUp}
            onPointerDown={handleItemPointerDown(file.id)}
            onPointerUp={interactions.handleMobileItemPointerUp}
            onRename={fileActionProps.onRename}
            onShare={fileActionProps.onShare}
            onToggleSelected={(checked) =>
              selection.setItemSelected(file.id, checked)
            }
            rowRef={getItemRowRef(file.id)}
            selectedCardPropertyDefinitions={selectedCardPropertyDefinitions}
            selectionControlCaptureProps={selectionControlCaptureProps}
          />
        );
      })}
    </div>
  );
}
