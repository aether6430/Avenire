import { useCallback, useRef, useState, type DragEvent, type TouchEvent } from "react";
import type { useFileSelection } from "@/hooks/use-file-selection";

interface UploadCandidate {
  file: File;
  relativePath?: string;
}

interface UseFileDragDropOptions {
  selection: ReturnType<typeof useFileSelection>;
  currentFolderId: string;
  isCurrentFolderReadOnly: boolean;
  moveItemsToFolder: (ids: string[], targetFolderId: string) => Promise<void>;
  queueUploads: (candidates: UploadCandidate[]) => void;
  getDropUploadCandidates: (
    event: DragEvent<HTMLDivElement>
  ) => Promise<UploadCandidate[]>;
}

export function useFileDragDrop({
  selection,
  currentFolderId,
  isCurrentFolderReadOnly,
  moveItemsToFolder,
  queueUploads,
  getDropUploadCandidates,
}: UseFileDragDropOptions) {
  const [canvasDropActive, setCanvasDropActive] = useState(false);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [draggingIds, setDraggingIds] = useState<string[]>([]);
  const canvasDragDepthRef = useRef(0);
  const dragPreviewPixelRef = useRef<HTMLImageElement | null>(null);
  const touchDragIdsRef = useRef<string[] | null>(null);

  const ensureDragPreviewPixel = useCallback(() => {
    if (dragPreviewPixelRef.current) {
      return dragPreviewPixelRef.current;
    }
    const pixel = new Image();
    pixel.src =
      "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    dragPreviewPixelRef.current = pixel;
    return pixel;
  }, []);

  const configureDragPreview = useCallback(
    (event: DragEvent<HTMLElement>) => {
      const pixel = ensureDragPreviewPixel();
      event.dataTransfer.setDragImage(pixel, 0, 0);
    },
    [ensureDragPreviewPixel]
  );

  const resetDragState = useCallback(() => {
    canvasDragDepthRef.current = 0;
    setCanvasDropActive(false);
    setDropTargetId(null);
    setDraggingIds([]);
  }, []);

  const handleCanvasDragEnter = useCallback(() => {
    if (isCurrentFolderReadOnly) {
      return;
    }
    canvasDragDepthRef.current += 1;
    setCanvasDropActive(true);
    setDropTargetId(currentFolderId);
  }, [currentFolderId, isCurrentFolderReadOnly]);

  const handleCanvasDragLeave = useCallback(() => {
    if (isCurrentFolderReadOnly) {
      return;
    }
    canvasDragDepthRef.current = Math.max(0, canvasDragDepthRef.current - 1);
    if (canvasDragDepthRef.current === 0) {
      setCanvasDropActive(false);
      setDropTargetId(null);
    }
  }, [isCurrentFolderReadOnly]);

  const updateTouchDropTarget = useCallback((clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    const target = element?.closest<HTMLElement>("[data-drop-folder-id]");
    const targetId = target?.dataset.dropFolderId ?? null;
    setDropTargetId(targetId);
    return targetId;
  }, []);

  const beginTouchDrag = useCallback(
    (itemId: string) => {
      const sourceIds = selection.prepareDrag(itemId);
      touchDragIdsRef.current = sourceIds;
      setDraggingIds(sourceIds);
    },
    [selection]
  );

  const moveTouchDrag = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      if (!touchDragIdsRef.current || event.touches.length === 0) {
        return;
      }
      const touch = event.touches[0];
      if (!touch) {
        return;
      }
      updateTouchDropTarget(touch.clientX, touch.clientY);
    },
    [updateTouchDropTarget]
  );

  const endTouchDrag = useCallback(
    (event: TouchEvent<HTMLDivElement>) => {
      const sourceIds = touchDragIdsRef.current;
      touchDragIdsRef.current = null;
      setDraggingIds([]);

      if (
        !sourceIds ||
        sourceIds.length === 0 ||
        event.changedTouches.length === 0
      ) {
        setDropTargetId(null);
        return;
      }

      const touch = event.changedTouches[0];
      if (!touch) {
        setDropTargetId(null);
        return;
      }

      const targetId = updateTouchDropTarget(touch.clientX, touch.clientY);
      if (!targetId) {
        setDropTargetId(null);
        return;
      }

      void moveItemsToFolder(sourceIds, targetId);
      setDropTargetId(null);
    },
    [moveItemsToFolder, updateTouchDropTarget]
  );

  const getCanvasDropProps = useCallback(() => {
    return {
      onDragEnter: handleCanvasDragEnter,
      onDragLeave: handleCanvasDragLeave,
      onDragOver: (event: DragEvent<HTMLDivElement>) => {
        if (isCurrentFolderReadOnly) {
          return;
        }
        event.preventDefault();
        const isExternalFileDrop = event.dataTransfer.types.includes("Files");
        event.dataTransfer.dropEffect = isExternalFileDrop ? "copy" : "move";
        setCanvasDropActive(true);
        setDropTargetId(currentFolderId);
      },
      onDrop: (event: DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        resetDragState();
        if (isCurrentFolderReadOnly) {
          setDraggingIds([]);
          return;
        }
        void (async () => {
          const uploadCandidates = await getDropUploadCandidates(event);
          if (uploadCandidates.length > 0) {
            queueUploads(uploadCandidates);
            setDraggingIds([]);
            return;
          }
          const sourceIds =
            draggingIds.length > 0
              ? draggingIds
              : Array.from(selection.selectedIds);
          await moveItemsToFolder(sourceIds, currentFolderId);
          setDraggingIds([]);
        })();
      },
    };
  }, [
    currentFolderId,
    draggingIds,
    getDropUploadCandidates,
    handleCanvasDragEnter,
    handleCanvasDragLeave,
    isCurrentFolderReadOnly,
    moveItemsToFolder,
    queueUploads,
    resetDragState,
    selection.selectedIds,
  ]);

  const getFolderDragProps = useCallback(
    (folderId: string, readOnly?: boolean) => {
      return {
        draggable: !readOnly,
        onDragEnd: resetDragState,
        onDragEnter: (event: DragEvent<HTMLElement>) => {
          if (readOnly) {
            return;
          }
          event.preventDefault();
          setDropTargetId(folderId);
        },
        onDragLeave: () => {
          setDropTargetId((current) => (current === folderId ? null : current));
        },
        onDragOver: (event: DragEvent<HTMLElement>) => {
          if (readOnly) {
            return;
          }
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTargetId(folderId);
        },
        onDragStart: (event: DragEvent<HTMLElement>) => {
          if (readOnly) {
            event.preventDefault();
            return;
          }
          const sourceIds = selection.prepareDrag(folderId);
          setDraggingIds(sourceIds);
          event.dataTransfer.effectAllowed = "move";
          configureDragPreview(event);
          event.dataTransfer.setData("text/plain", sourceIds.join(","));
        },
        onDrop: (event: DragEvent<HTMLElement>) => {
          event.preventDefault();
          event.stopPropagation();
          if (readOnly) {
            resetDragState();
            return;
          }
          const sourceIds =
            draggingIds.length > 0
              ? draggingIds
              : Array.from(selection.selectedIds);
          resetDragState();
          void moveItemsToFolder(sourceIds, folderId);
          setDraggingIds([]);
        },
        onTouchEnd: endTouchDrag,
        onTouchMove: moveTouchDrag,
        onTouchStart: () => {
          if (readOnly) {
            return;
          }
          beginTouchDrag(folderId);
        },
      };
    },
    [
      beginTouchDrag,
      configureDragPreview,
      draggingIds,
      endTouchDrag,
      moveItemsToFolder,
      moveTouchDrag,
      resetDragState,
      selection,
    ]
  );

  const getFileDragProps = useCallback(
    (fileId: string, readOnly?: boolean) => {
      return {
        draggable: !readOnly,
        onDragEnd: resetDragState,
        onDragStart: (event: DragEvent<HTMLElement>) => {
          if (readOnly) {
            event.preventDefault();
            return;
          }
          const sourceIds = selection.prepareDrag(fileId);
          setDraggingIds(sourceIds);
          event.dataTransfer.effectAllowed = "move";
          configureDragPreview(event);
          event.dataTransfer.setData("text/plain", sourceIds.join(","));
        },
        onTouchEnd: endTouchDrag,
        onTouchMove: moveTouchDrag,
        onTouchStart: () => {
          if (readOnly) {
            return;
          }
          beginTouchDrag(fileId);
        },
      };
    },
    [
      beginTouchDrag,
      configureDragPreview,
      endTouchDrag,
      moveTouchDrag,
      resetDragState,
      selection,
    ]
  );

  return {
    canvasDropActive,
    dropTargetId,
    draggingIds,
    canvasDragDepthRef,
    dragPreviewPixelRef,
    touchDragIdsRef,
    handleCanvasDragEnter,
    handleCanvasDragLeave,
    configureDragPreview,
    ensureDragPreviewPixel,
    beginTouchDrag,
    moveTouchDrag,
    endTouchDrag,
    getCanvasDropProps,
    getFolderDragProps,
    getFileDragProps,
  };
}
