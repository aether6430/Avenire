"use client";

import { ArrowsSplit } from "@phosphor-icons/react";
import { type DragEvent, Fragment, type RefObject } from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type {
  PaneDropPreview,
  RenderablePaneRow,
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
    forcedRegion?: "bottom" | "center" | "left" | "right" | "top"
  ) => void;
  handlePaneLayout: (row: RenderablePaneRow, nextSizes: number[]) => void;
  handleRowLayout: (nextSizes: number[]) => void;
  openPane: (
    href: string,
    options?: {
      sourcePaneId?: string;
      splitDirection?: WorkspacePaneSplitDirection;
      splitPlacement?: "before" | "after";
    }
  ) => void;
  paneCount: number;
  paneRows: RenderablePaneRow[];
}

function buildPaneLayoutKey(row: RenderablePaneRow) {
  return `${row.id}:${row.panes.map((pane) => pane.id).join("|")}`;
}

function buildRowLayoutKey(rows: RenderablePaneRow[]) {
  return rows.map(buildPaneLayoutKey).join("||");
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
  handlePaneLayout,
  handleRowLayout,
  openPane,
  paneCount,
  paneRows,
}: WorkspacePaneDesktopLayoutProps) {
  return (
    <div
      className="flex h-full w-full flex-col bg-background"
      ref={containerRef}
    >
      <div
        className="flex h-full min-w-0 flex-col"
        onDragLeave={handleContainerDragLeave}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
      >
        <PanelGroup
          className="min-h-0 flex-1"
          direction="vertical"
          key={buildRowLayoutKey(paneRows)}
          onLayout={handleRowLayout}
        >
          {paneRows.map((row, rowIndex) => (
            <Fragment key={row.id}>
              <Panel defaultSize={row.size} minSize={18} order={rowIndex + 1}>
                <PanelGroup
                  className="h-full min-w-0"
                  direction="horizontal"
                  key={buildPaneLayoutKey(row)}
                  onLayout={(nextSizes) => {
                    handlePaneLayout(row, nextSizes);
                  }}
                >
                  {row.panes.map((pane, paneIndex) => {
                    const isPreviewPane = Boolean(pane.isDropPreview);
                    const dropTargetPaneId = isPreviewPane
                      ? (pane.previewTargetPaneId ??
                        dropPreview?.paneId ??
                        pane.id)
                      : pane.id;
                    const isActive = pane.id === activePaneId;
                    const isMultiPane = paneCount > 1 && !isPreviewPane;

                    return (
                      <Fragment key={pane.id}>
                        <Panel
                          defaultSize={pane.size}
                          minSize={20}
                          order={paneIndex + 1}
                        >
                          <div className="flex h-full min-h-0 w-full min-w-0">
                            <WorkspacePaneSurface
                              dropRegion={
                                dropPreview?.paneId === pane.id
                                  ? dropPreview.region
                                  : null
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
                                  isPreviewPane
                                    ? dropPreview?.region
                                    : undefined
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
                              onSplitVertical={() =>
                                !isPreviewPane &&
                                openPane("/workspace", {
                                  sourcePaneId: pane.id,
                                  splitDirection: "vertical",
                                  splitPlacement: "after",
                                })
                              }
                              pane={pane}
                            />
                          </div>
                        </Panel>
                        {paneIndex < row.panes.length - 1 ? (
                          <PanelResizeHandle className="relative z-20 w-3 shrink-0 bg-border/35 transition-colors hover:bg-border/75 data-[resize-handle-active]:bg-border/75">
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70">
                              <ArrowsSplit className="size-3.5" />
                            </div>
                          </PanelResizeHandle>
                        ) : null}
                      </Fragment>
                    );
                  })}
                </PanelGroup>
              </Panel>
              {rowIndex < paneRows.length - 1 ? (
                <PanelResizeHandle className="relative z-20 h-3 shrink-0 bg-border/35 transition-colors hover:bg-border/75 data-[resize-handle-active]:bg-border/75">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70">
                    <ArrowsSplit className="size-3.5 rotate-90" />
                  </div>
                </PanelResizeHandle>
              ) : null}
            </Fragment>
          ))}
        </PanelGroup>
      </div>
    </div>
  );
}
