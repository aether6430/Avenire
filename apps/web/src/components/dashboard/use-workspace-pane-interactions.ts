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
  setPaneRoute: (
    paneId: string,
    route: {
      pathname: string;
      search: string;
    }
  ) => void;
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
  };
}
