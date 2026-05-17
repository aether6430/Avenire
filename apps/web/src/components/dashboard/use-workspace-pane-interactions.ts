"use client";

import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  createTransparentDragImage,
  getDraggedPaneId,
  getPaneDropRegion,
  getPaneSplitDirection,
  getPaneSplitPlacement,
  isDragLeaveInsideElement,
  isSameDropPreview,
  type PaneDropPreview,
  type RenderablePane,
  WORKSPACE_PANE_REORDER_MIME,
} from "@/components/dashboard/workspace-pane-renderer-model";
import {
  buildRouteState,
  clearWorkspacePaneDragData,
  getWorkspacePaneDragHref,
  hasWorkspacePaneDragHref,
} from "@/lib/workspace-panes";

export function useWorkspacePaneInteractions({
  focusPane,
  movePaneToSplit,
  openPane,
  panes,
  reorderPanes,
  setPaneRoute,
  setPaneSizes,
  setRowSizes,
  rows,
}: {
  focusPane: (paneId: string) => void;
  movePaneToSplit: (
    draggedPaneId: string,
    targetPaneId: string,
    options: {
      splitDirection: "horizontal" | "vertical";
      splitPlacement: "before" | "after";
    }
  ) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: "horizontal" | "vertical";
      splitPlacement?: "before" | "after";
    }
  ) => void;
  panes: RenderablePane[];
  reorderPanes: (draggedPaneId: string, targetPaneId: string) => void;
  rows: Array<{ id: string; size: number }>;
  setPaneRoute: (
    paneId: string,
    route: {
      pathname: string;
      search: string;
    }
  ) => void;
  setPaneSizes: (rowId: string, nextSizes: number[]) => void;
  setRowSizes: (nextSizes: number[]) => void;
}) {
  const [draggedPaneId, setDraggedPaneId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<PaneDropPreview | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragGhostImageRef = useRef<HTMLCanvasElement | null>(null);
  const previewFrameRef = useRef<number | null>(null);

  useEffect(() => {
    dragGhostImageRef.current = createTransparentDragImage();
  }, []);

  const clearDragState = useCallback(() => {
    if (previewFrameRef.current !== null) {
      window.cancelAnimationFrame(previewFrameRef.current);
      previewFrameRef.current = null;
    }
    setDraggedPaneId(null);
    setDropPreview(null);
    clearWorkspacePaneDragData();
  }, []);

  useEffect(() => {
    window.addEventListener("dragend", clearDragState);
    window.addEventListener("drop", clearDragState);

    return () => {
      window.removeEventListener("dragend", clearDragState);
      window.removeEventListener("drop", clearDragState);
      if (previewFrameRef.current !== null) {
        window.cancelAnimationFrame(previewFrameRef.current);
      }
    };
  }, [clearDragState]);

  const queueDropPreview = useCallback(
    (nextPreview: PaneDropPreview | null) => {
      if (previewFrameRef.current !== null) {
        window.cancelAnimationFrame(previewFrameRef.current);
      }

      previewFrameRef.current = window.requestAnimationFrame(() => {
        previewFrameRef.current = null;
        setDropPreview((current) =>
          isSameDropPreview(current, nextPreview) ? current : nextPreview
        );
      });
    },
    []
  );

  const startPaneResize = useCallback(
    (targetId: string, index: number, startClientX: number) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const startingSizes = panes
        .filter((pane) => pane.rowId === targetId)
        .map((pane) => pane.size);
      const bounds = container.getBoundingClientRect();
      const containerSize = bounds.width;
      if (containerSize <= 0) {
        return;
      }

      const handlePointerMove = (event: PointerEvent) => {
        const delta = event.clientX - startClientX;
        const deltaPercent = (delta / containerSize) * 100;
        const leftSize = Math.max(20, startingSizes[index]! + deltaPercent);
        const rightSize = Math.max(
          20,
          startingSizes[index + 1]! - deltaPercent
        );
        const adjustedTotal = leftSize + rightSize;
        const fixedLeft =
          (leftSize / adjustedTotal) *
          (startingSizes[index]! + startingSizes[index + 1]!);
        const fixedRight =
          (rightSize / adjustedTotal) *
          (startingSizes[index]! + startingSizes[index + 1]!);
        const nextSizes = [...startingSizes];
        nextSizes[index] = fixedLeft;
        nextSizes[index + 1] = fixedRight;
        setPaneSizes(targetId, nextSizes);
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [panes, setPaneSizes]
  );

  const startRowResize = useCallback(
    (index: number, startClientY: number) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const startingSizes = rows.map((row) => row.size);
      const bounds = container.getBoundingClientRect();
      const containerSize = bounds.height;
      if (containerSize <= 0) {
        return;
      }

      const handlePointerMove = (event: PointerEvent) => {
        const delta = event.clientY - startClientY;
        const deltaPercent = (delta / containerSize) * 100;
        const topSize = Math.max(18, startingSizes[index]! + deltaPercent);
        const bottomSize = Math.max(
          18,
          startingSizes[index + 1]! - deltaPercent
        );
        const adjustedTotal = topSize + bottomSize;
        const fixedTop =
          (topSize / adjustedTotal) *
          (startingSizes[index]! + startingSizes[index + 1]!);
        const fixedBottom =
          (bottomSize / adjustedTotal) *
          (startingSizes[index]! + startingSizes[index + 1]!);
        const nextSizes = [...startingSizes];
        nextSizes[index] = fixedTop;
        nextSizes[index + 1] = fixedBottom;
        setRowSizes(nextSizes);
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [rows, setRowSizes]
  );

  const handlePaneDrop = useCallback(
    (
      event: DragEvent<HTMLDivElement>,
      targetPaneId: string,
      forcedRegion?: "bottom" | "center" | "left" | "right" | "top"
    ) => {
      const targetBounds = event.currentTarget.getBoundingClientRect();
      const region = forcedRegion ?? getPaneDropRegion(event, targetBounds);
      const droppedPaneId = getDraggedPaneId(event.dataTransfer, draggedPaneId);
      const droppedHref = getWorkspacePaneDragHref(event.dataTransfer);
      if (droppedHref) {
        event.preventDefault();
        if (region === "center") {
          focusPane(targetPaneId);
          setPaneRoute(targetPaneId, buildRouteState(droppedHref));
        } else {
          openPane(droppedHref, {
            sourcePaneId: targetPaneId,
            splitDirection: getPaneSplitDirection(region),
            splitPlacement: getPaneSplitPlacement(region),
          });
        }
        clearDragState();
        return;
      }

      if (droppedPaneId && droppedPaneId !== targetPaneId) {
        event.preventDefault();
        if (region === "center") {
          reorderPanes(droppedPaneId, targetPaneId);
        } else {
          movePaneToSplit(droppedPaneId, targetPaneId, {
            splitDirection: getPaneSplitDirection(region),
            splitPlacement: getPaneSplitPlacement(region),
          });
        }
        clearDragState();
      }
    },
    [
      clearDragState,
      draggedPaneId,
      focusPane,
      movePaneToSplit,
      openPane,
      reorderPanes,
      setPaneRoute,
    ]
  );

  const rowDropTargetId = panes[0]?.id ?? null;

  const handleContainerDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (isDragLeaveInsideElement(event)) {
        return;
      }

      queueDropPreview(null);
    },
    [queueDropPreview]
  );

  const handleContainerDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const activeDraggedPaneId = getDraggedPaneId(
        event.dataTransfer,
        draggedPaneId
      );
      if (
        rowDropTargetId &&
        (hasWorkspacePaneDragHref(event.dataTransfer) || activeDraggedPaneId)
      ) {
        event.preventDefault();
        event.dataTransfer.dropEffect = activeDraggedPaneId ? "move" : "copy";
      }
    },
    [draggedPaneId, rowDropTargetId]
  );

  const handleContainerDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (rowDropTargetId) {
        handlePaneDrop(event, rowDropTargetId);
      }
    },
    [handlePaneDrop, rowDropTargetId]
  );

  const handlePaneDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>, paneId: string) => {
      const dragImage = dragGhostImageRef.current;
      if (dragImage) {
        event.dataTransfer.setDragImage(dragImage, 0, 0);
      }
      clearWorkspacePaneDragData();
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(WORKSPACE_PANE_REORDER_MIME, paneId);
      event.dataTransfer.setData("text/plain", paneId);
      setDraggedPaneId(paneId);
    },
    []
  );

  const handlePaneDragLeave = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const container = containerRef.current;
      if (container && isDragLeaveInsideElement(event, container)) {
        return;
      }

      queueDropPreview(null);
    },
    [queueDropPreview]
  );

  const handlePaneDragOver = useCallback(
    (
      event: DragEvent<HTMLDivElement>,
      paneId: string,
      isPreviewPane: boolean,
      dropTargetPaneId: string
    ) => {
      const activeDraggedPaneId = getDraggedPaneId(
        event.dataTransfer,
        draggedPaneId
      );
      const droppedHref = getWorkspacePaneDragHref(event.dataTransfer);
      if (droppedHref || activeDraggedPaneId) {
        event.preventDefault();
        if (activeDraggedPaneId === paneId || isPreviewPane) {
          if (dropPreview?.paneId === paneId) {
            queueDropPreview(null);
          }
          return;
        }
        event.dataTransfer.dropEffect = activeDraggedPaneId ? "move" : "copy";
        queueDropPreview({
          href: droppedHref,
          paneId: dropTargetPaneId,
          region: getPaneDropRegion(
            event,
            event.currentTarget.getBoundingClientRect()
          ),
        });
      }
    },
    [draggedPaneId, dropPreview?.paneId, queueDropPreview]
  );

  return {
    containerRef,
    draggedPaneId,
    dropPreview,
    handleContainerDragLeave,
    handleContainerDragOver,
    handleContainerDrop,
    handlePaneDragEnd: clearDragState,
    handlePaneDragLeave,
    handlePaneDragOver,
    handlePaneDragStart,
    handlePaneDrop,
    rowDropTargetId,
    startPaneResize,
    startRowResize,
  };
}
