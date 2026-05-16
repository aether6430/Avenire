"use client";

import { ArrowsSplit } from "@phosphor-icons/react";
import type { DragEvent, RefObject } from "react";
import type {
  PaneDropPreview,
  RenderablePane,
} from "@/components/dashboard/workspace-pane-renderer-model";
import { WorkspacePaneScene } from "@/components/dashboard/workspace-pane-scene";
import { WorkspacePaneSurface } from "@/components/dashboard/workspace-pane-surface";
import {
  WorkspacePaneInteractionBoundary,
  WorkspacePaneProvider,
  type WorkspacePaneSplitDirection,
} from "@/lib/workspace-panes";
import { WorkspaceHeader } from "./workspace-header";

export interface WorkspacePaneMobileLayoutProps {
  browserRoute: { pathname: string; search: string };
  paneId: string;
}

export function WorkspacePaneMobileLayout({
  browserRoute,
  paneId,
}: WorkspacePaneMobileLayoutProps) {
  return (
    <WorkspacePaneProvider
      isActive
      isCompact
      paneId={paneId}
      route={browserRoute}
    >
      <div className="flex h-full min-w-0 flex-col bg-background">
        <WorkspaceHeader
          className="border-border/60 border-b"
          compact
          overlay
          paneId={paneId}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <WorkspacePaneInteractionBoundary>
            <WorkspacePaneScene
              paneId={paneId}
              pathname={browserRoute.pathname}
              search={browserRoute.search}
            />
          </WorkspacePaneInteractionBoundary>
        </div>
      </div>
    </WorkspacePaneProvider>
  );
}

export interface WorkspacePaneDesktopLayoutProps {
  activePaneId: string | null;
  closePane: (paneId: string) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  draggedPaneId: string | null;
  dropPreview: PaneDropPreview | null;
  focusPane: (paneId: string) => void;
  handleContainerDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handleContainerDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleContainerDrop: (event: DragEvent<HTMLDivElement>) => void;
  handlePaneDragEnd: () => void;
  handlePaneDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  handlePaneDragOver: (
    event: DragEvent<HTMLDivElement>,
    paneId: string,
    isPreviewPane: boolean,
    dropTargetPaneId: string
  ) => void;
  handlePaneDragStart: (
    event: DragEvent<HTMLDivElement>,
    paneId: string
  ) => void;
  handlePaneDrop: (
    event: DragEvent<HTMLDivElement>,
    targetPaneId: string,
    forcedRegion?: "center" | "left" | "right"
  ) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: WorkspacePaneSplitDirection;
      splitPlacement?: "before" | "after";
    }
  ) => void;
  rowPanes: RenderablePane[];
  startPaneResize: (
    targetId: string,
    index: number,
    startClientX: number
  ) => void;
}

export function WorkspacePaneDesktopLayout({
  activePaneId,
  closePane,
  containerRef,
  draggedPaneId,
  dropPreview,
  focusPane,
  handleContainerDragLeave,
  handleContainerDragOver,
  handleContainerDrop,
  handlePaneDragEnd,
  handlePaneDragLeave,
  handlePaneDragOver,
  handlePaneDragStart,
  handlePaneDrop,
  openPane,
  rowPanes,
  startPaneResize,
}: WorkspacePaneDesktopLayoutProps) {
  return (
    <div
      className="flex h-full w-full flex-col bg-background"
      ref={containerRef}
    >
      <div
        className="flex h-full min-w-0"
        onDragLeave={handleContainerDragLeave}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        {rowPanes.map((pane, paneIndex) => {
          const isPreviewPane = Boolean(pane.isDropPreview);
          const dropTargetPaneId = isPreviewPane
            ? (pane.previewTargetPaneId ?? dropPreview?.paneId ?? pane.id)
            : pane.id;
          const isActive = pane.id === activePaneId;
          const isMultiPane = rowPanes.length > 1 && !isPreviewPane;
          return (
            <div
              className="flex min-w-0 shrink-0"
              key={pane.id}
              style={{
                transition: draggedPaneId
                  ? "width 180ms cubic-bezier(0.22, 1, 0.36, 1)"
                  : undefined,
                width: `${pane.size}%`,
              }}
            >
              <WorkspacePaneSurface
                dropRegion={
                  dropPreview?.paneId === pane.id ? dropPreview.region : null
                }
                isActive={isActive}
                isDragging={pane.id === draggedPaneId}
                isMultiPane={isMultiPane}
                isPreviewPane={isPreviewPane}
                onClose={() => {
                  if (!isPreviewPane) {
                    closePane(pane.id);
                  }
                }}
                onDragEnd={handlePaneDragEnd}
                onDragLeave={handlePaneDragLeave}
                onDragOver={(event) => {
                  handlePaneDragOver(
                    event,
                    pane.id,
                    isPreviewPane,
                    dropTargetPaneId
                  );
                }}
                onDragStart={(event) => {
                  handlePaneDragStart(event, pane.id);
                }}
                onDrop={(event) => {
                  event.stopPropagation();
                  handlePaneDrop(
                    event,
                    dropTargetPaneId,
                    isPreviewPane ? dropPreview?.region : undefined
                  );
                }}
                onFocus={() => {
                  if (!isPreviewPane) {
                    focusPane(pane.id);
                  }
                }}
                onSplitHorizontal={() =>
                  !isPreviewPane &&
                  openPane("/workspace", {
                    sourcePaneId: pane.id,
                    splitDirection: "horizontal",
                    splitPlacement: "after",
                  })
                }
                pane={pane}
              />
              {paneIndex < rowPanes.length - 1 ? (
                <div
                  aria-hidden="true"
                  className="relative z-20 w-3 shrink-0 cursor-col-resize bg-border/35 transition-colors hover:bg-border/75"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    startPaneResize(
                      rowPanes[0]?.rowId,
                      paneIndex,
                      event.clientX
                    );
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70">
                    <ArrowsSplit className="size-3.5" />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
