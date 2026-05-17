"use client";

import {
  ExplorerFileListRow,
  ExplorerFolderListRow,
} from "@/components/files/explorer/explorer-list-rows";
import type { ExplorerBrowseSurfaceProps } from "./explorer-browse-surface-types";
import { buildSelectionControlCaptureProps } from "./explorer-browse-surface-types";

export function ExplorerBrowseList({
  contextMenuSurfaceClass,
  dropTargetId,
  explorerEntries,
  folderFileCount,
  folderPreviewKinds,
  folderSubfolderCount,
  getFileDragProps,
  getFileIcon,
  getFileItemActionProps,
  getFileKind,
  getFolderDragProps,
  getFolderItemActionProps,
  interactions,
  isMobile,
  itemActionTargetSelector,
  listMeasureElement,
  listTotalSize,
  listVirtualItems,
  onOpenFile,
  onOpenFolder,
  selectedCardPropertyDefinitions,
  selection,
  setItemRowRef,
  viewMode,
  visibleItemIds,
}: Pick<
  ExplorerBrowseSurfaceProps,
  | "contextMenuSurfaceClass"
  | "dropTargetId"
  | "explorerEntries"
  | "folderFileCount"
  | "folderPreviewKinds"
  | "folderSubfolderCount"
  | "getFileDragProps"
  | "getFileIcon"
  | "getFileItemActionProps"
  | "getFileKind"
  | "getFolderDragProps"
  | "getFolderItemActionProps"
  | "interactions"
  | "isMobile"
  | "itemActionTargetSelector"
  | "listMeasureElement"
  | "listTotalSize"
  | "listVirtualItems"
  | "onOpenFile"
  | "onOpenFolder"
  | "selectedCardPropertyDefinitions"
  | "selection"
  | "setItemRowRef"
  | "viewMode"
  | "visibleItemIds"
>) {
  if (viewMode !== "list") {
    return null;
  }

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
    <div className="rounded-md bg-secondary/30">
      <div
        className="relative w-full"
        style={{
          height: `${listTotalSize}px`,
        }}
      >
        {listVirtualItems.map((virtualItem) => {
          const entry = explorerEntries[virtualItem.index];
          if (!entry) {
            return null;
          }

          return (
            <div
              data-index={virtualItem.index}
              key={virtualItem.key}
              ref={listMeasureElement}
              style={{
                left: 0,
                position: "absolute",
                top: 0,
                transform: `translateY(${virtualItem.start}px)`,
                width: "100%",
              }}
            >
              {entry.kind === "folder" ? (
                <ExplorerFolderListRow
                  dragProps={getFolderDragProps(
                    entry.folder.id,
                    entry.folder.readOnly
                  )}
                  fileCount={folderFileCount.get(entry.folder.id) ?? 0}
                  folderCount={folderSubfolderCount.get(entry.folder.id) ?? 0}
                  folderId={entry.folder.id}
                  folderName={entry.folder.name}
                  isDropTarget={dropTargetId === entry.folder.id}
                  isMobile={isMobile}
                  isSelected={selection.selectedIds.has(entry.folder.id)}
                  itemActionProps={getFolderItemActionProps(entry.folder, {
                    fileCount: folderFileCount.get(entry.folder.id) ?? 0,
                    folderCount: folderSubfolderCount.get(entry.folder.id) ?? 0,
                  })}
                  onClick={(event) => {
                    handleSelectableItemClick(event, entry.folder.id, () =>
                      onOpenFolder(entry.folder.id)
                    );
                  }}
                  onContextMenu={(event) =>
                    interactions.handleItemContextMenu(event, entry.folder.id)
                  }
                  onPointerCancel={interactions.handleMobileItemPointerUp}
                  onPointerDown={handleItemPointerDown(entry.folder.id)}
                  onPointerUp={interactions.handleMobileItemPointerUp}
                  onToggleSelected={() =>
                    selection.toggleSelection(entry.folder.id)
                  }
                  previewKinds={folderPreviewKinds.get(entry.folder.id) ?? []}
                  rowRef={getItemRowRef(entry.folder.id)}
                  selectionControlCaptureProps={selectionControlCaptureProps}
                  showBorder={virtualItem.index < explorerEntries.length - 1}
                  updatedAt={entry.folder.updatedAt}
                />
              ) : (
                (() => {
                  const fileKind = getFileKind(entry.file);
                  return (
                    <ExplorerFileListRow
                      dragProps={getFileDragProps(
                        entry.file.id,
                        entry.file.readOnly
                      )}
                      file={entry.file}
                      icon={getFileIcon(entry.file, fileKind)}
                      isMobile={isMobile}
                      isSelected={selection.selectedIds.has(entry.file.id)}
                      itemActionProps={getFileItemActionProps(entry.file)}
                      onClick={(event) => {
                        handleSelectableItemClick(event, entry.file.id, () =>
                          onOpenFile(entry.file.id)
                        );
                      }}
                      onContextMenu={(event) =>
                        interactions.handleItemContextMenu(event, entry.file.id)
                      }
                      onPointerCancel={interactions.handleMobileItemPointerUp}
                      onPointerDown={handleItemPointerDown(entry.file.id)}
                      onPointerUp={interactions.handleMobileItemPointerUp}
                      onToggleSelected={(checked) =>
                        selection.setItemSelected(entry.file.id, checked)
                      }
                      rowRef={getItemRowRef(entry.file.id)}
                      selectedCardPropertyDefinitions={
                        selectedCardPropertyDefinitions
                      }
                      selectionControlCaptureProps={
                        selectionControlCaptureProps
                      }
                      showBorder={
                        virtualItem.index < explorerEntries.length - 1
                      }
                    />
                  );
                })()
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
