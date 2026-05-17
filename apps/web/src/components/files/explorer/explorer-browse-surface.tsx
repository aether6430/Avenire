"use client";

import {
  ExplorerFileCard,
  ExplorerFolderCard,
} from "@/components/files/explorer/explorer-cards";
import type { ExplorerCardFileType } from "@/components/files/explorer/explorer-cards-shared";
import type { ExplorerItemActionsProps } from "@/components/files/explorer/explorer-item-actions";
import {
  ExplorerFileListRow,
  ExplorerFolderListRow,
} from "@/components/files/explorer/explorer-list-rows";
import type { SelectionControlCaptureProps } from "@/components/files/explorer/explorer-list-rows-shared";
import type {
  FileRecord,
  FolderRecord,
} from "@/components/files/explorer/shared";
import type { ExplorerEntry } from "@/components/files/explorer/workspace-folder-browse-model";
import type { WorkspacePropertyDefinition } from "@/lib/frontmatter";
import { cn } from "@/lib/utils";

interface ExplorerBrowseSelectionApi {
  handleItemClick: (
    event: React.MouseEvent<HTMLDivElement>,
    itemId: string,
    visibleItemIds: string[]
  ) => void;
  selectedIds: Set<string>;
  setItemSelected: (itemId: string, selected: boolean) => void;
  toggleSelection: (itemId: string) => void;
}

interface ExplorerBrowseInteractionsApi {
  beginMobileItemLongPress: (itemId: string) => void;
  handleItemContextMenu: (
    event: React.MouseEvent<HTMLElement>,
    itemId: string
  ) => void;
  handleMobileItemClick: (itemId: string, openItem: () => void) => void;
  handleMobileItemPointerUp: React.PointerEventHandler<HTMLDivElement>;
  handleOpenOnDoubleClick: (
    event: React.MouseEvent<HTMLElement>,
    open: () => void
  ) => void;
  shouldIgnoreItemClick: (event: React.MouseEvent<HTMLElement>) => boolean;
  stopItemSelectionEvent: (event: React.SyntheticEvent<HTMLElement>) => void;
}

interface ExplorerBrowseVirtualItem {
  index: number;
  key: React.Key;
  start: number;
}

interface ExplorerBrowseSurfaceProps {
  allFolders: FolderRecord[];
  contextMenuSurfaceClass: string;
  dropTargetId: string | null;
  explorerEntries: ExplorerEntry[];
  folderFileCount: Map<string, number>;
  folderPreviewKinds: Map<string, string[]>;
  folderSubfolderCount: Map<string, number>;
  getFileDragProps: (
    fileId: string,
    readOnly?: boolean
  ) => React.HTMLAttributes<HTMLDivElement> | undefined;
  getFileIcon: (
    file: Pick<FileRecord, "page">,
    kind: ExplorerCardFileType
  ) => React.ReactNode;
  getFileItemActionProps: (file: FileRecord) => ExplorerItemActionsProps;
  getFileKind: (file: FileRecord) => ExplorerCardFileType;
  getFolderDragProps: (
    folderId: string,
    readOnly?: boolean
  ) => React.HTMLAttributes<HTMLDivElement> | undefined;
  getFolderItemActionProps: (
    folder: FolderRecord,
    counts: {
      fileCount: number;
      folderCount: number;
    }
  ) => ExplorerItemActionsProps;
  hoveredPreviewFileId: string | null;
  interactions: ExplorerBrowseInteractionsApi;
  isMobile: boolean;
  itemActionTargetSelector: string;
  listMeasureElement: React.RefCallback<HTMLDivElement>;
  listTotalSize: number;
  listVirtualItems: ExplorerBrowseVirtualItem[];
  onChangeFolderBanner: (folderId: string) => void;
  onCreateFolderHere: (folderId: string) => void;
  onOpenFile: (fileId: string) => void;
  onOpenFolder: (folderId: string) => void;
  onPreviewIntentEnd: (file: FileRecord) => void;
  onPreviewIntentStart: (file: FileRecord) => void;
  onResetFolderBanner: (folderId: string) => void;
  selectedCardPropertyDefinitions: WorkspacePropertyDefinition[];
  selection: ExplorerBrowseSelectionApi;
  setItemRowRef: (itemId: string, node: HTMLDivElement | null) => void;
  sortedFiles: FileRecord[];
  sortedFolders: FolderRecord[];
  viewMode: "cards" | "list";
  visibleItemIds: string[];
}

export function ExplorerBrowseSurface({
  allFolders,
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
  hoveredPreviewFileId,
  interactions,
  isMobile,
  itemActionTargetSelector,
  listMeasureElement,
  listTotalSize,
  listVirtualItems,
  onChangeFolderBanner,
  onCreateFolderHere,
  onOpenFile,
  onOpenFolder,
  onPreviewIntentEnd,
  onPreviewIntentStart,
  onResetFolderBanner,
  selection,
  selectedCardPropertyDefinitions,
  setItemRowRef,
  sortedFiles,
  sortedFolders,
  viewMode,
  visibleItemIds,
}: ExplorerBrowseSurfaceProps) {
  const selectionControlCaptureProps: SelectionControlCaptureProps = {
    onClickCapture: interactions.stopItemSelectionEvent,
    onMouseDownCapture: interactions.stopItemSelectionEvent,
    onPointerDownCapture: interactions.stopItemSelectionEvent,
  };

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
    <>
      <div
        className={cn("flex flex-wrap gap-3", viewMode !== "cards" && "hidden")}
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

      {viewMode === "list" ? (
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
                      folderCount={
                        folderSubfolderCount.get(entry.folder.id) ?? 0
                      }
                      folderId={entry.folder.id}
                      folderName={entry.folder.name}
                      isDropTarget={dropTargetId === entry.folder.id}
                      isMobile={isMobile}
                      isSelected={selection.selectedIds.has(entry.folder.id)}
                      itemActionProps={getFolderItemActionProps(entry.folder, {
                        fileCount: folderFileCount.get(entry.folder.id) ?? 0,
                        folderCount:
                          folderSubfolderCount.get(entry.folder.id) ?? 0,
                      })}
                      onClick={(event) => {
                        handleSelectableItemClick(event, entry.folder.id, () =>
                          onOpenFolder(entry.folder.id)
                        );
                      }}
                      onContextMenu={(event) =>
                        interactions.handleItemContextMenu(
                          event,
                          entry.folder.id
                        )
                      }
                      onPointerCancel={interactions.handleMobileItemPointerUp}
                      onPointerDown={handleItemPointerDown(entry.folder.id)}
                      onPointerUp={interactions.handleMobileItemPointerUp}
                      onToggleSelected={() =>
                        selection.toggleSelection(entry.folder.id)
                      }
                      previewKinds={
                        folderPreviewKinds.get(entry.folder.id) ?? []
                      }
                      rowRef={getItemRowRef(entry.folder.id)}
                      selectionControlCaptureProps={
                        selectionControlCaptureProps
                      }
                      showBorder={
                        virtualItem.index < explorerEntries.length - 1
                      }
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
                            handleSelectableItemClick(
                              event,
                              entry.file.id,
                              () => onOpenFile(entry.file.id)
                            );
                          }}
                          onContextMenu={(event) =>
                            interactions.handleItemContextMenu(
                              event,
                              entry.file.id
                            )
                          }
                          onPointerCancel={
                            interactions.handleMobileItemPointerUp
                          }
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
      ) : null}
    </>
  );
}
