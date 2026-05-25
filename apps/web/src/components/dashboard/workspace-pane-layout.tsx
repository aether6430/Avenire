"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { cn } from "@avenire/ui/lib/utils";
import {
  ArrowsSplit,
  Columns,
  DotsThree as MoreHorizontal,
  Rows,
  X,
} from "@phosphor-icons/react";
import {
  type DragEvent,
  Fragment,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import type {
  PaneDropPreview,
  PaneDropRegion,
  RenderablePane,
  RenderablePaneRow,
} from "@/components/dashboard/workspace-pane-renderer-model";
import {
  COMPACT_PANE_WIDTH,
  getDropIndicatorStyle,
  isInteractiveHeaderTarget,
} from "@/components/dashboard/workspace-pane-renderer-model";
import { WorkspacePaneScene } from "@/components/dashboard/workspace-pane-scene";
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

function PaneHeader({
  compact,
  paneId,
  trailingActions,
}: {
  compact: boolean;
  paneId: string;
  trailingActions?: ReactNode;
}) {
  return (
    <WorkspaceHeader
      className="border-b-0"
      compact={compact}
      paneId={paneId}
      trailingActions={trailingActions ?? null}
    />
  );
}

export function WorkspacePaneSurface({
  dropRegion,
  isActive,
  isDragging,
  isPreviewPane,
  isMultiPane,
  onClose,
  onDragEnd,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  onFocus,
  onSplitHorizontal,
  onSplitVertical,
  pane,
}: {
  dropRegion: PaneDropRegion | null;
  isActive: boolean;
  isDragging: boolean;
  isPreviewPane: boolean;
  isMultiPane: boolean;
  onClose: () => void;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  pane: RenderablePane;
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const element = surfaceRef.current;
    if (!element) {
      return;
    }

    const updateWidth = () => {
      setWidth(element.getBoundingClientRect().width);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") {
      return () => undefined;
    }

    const observer = new ResizeObserver(() => {
      updateWidth();
    });
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isCompact = width > 0 && width < COMPACT_PANE_WIDTH;
  const showPaneMenuInHeader =
    !pane.route.pathname.startsWith("/workspace/files/");
  const paneMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Pane actions"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm transition hover:bg-muted/70 hover:text-foreground"
            type="button"
          />
        }
      >
        <MoreHorizontal className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuItem onClick={onSplitHorizontal}>
          <Columns className="mr-2 size-4" />
          Split right
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onSplitVertical}>
          <Rows className="mr-2 size-4" />
          Split down
        </DropdownMenuItem>
        {isMultiPane ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onClose} variant="destructive">
              <X className="mr-2 size-4" />
              Close pane
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="h-full w-full min-w-0" ref={surfaceRef}>
      <WorkspacePaneProvider
        isActive={isActive}
        isCompact={isCompact}
        paneId={pane.id}
        route={pane.route}
      >
        <div
          className={cn(
            "relative flex h-full min-w-0 flex-col overflow-hidden border-border/70 border-r bg-background transition-[opacity,transform,box-shadow] duration-200 ease-out",
            isActive ? "ring-1 ring-border/90 ring-inset" : "ring-0",
            isDragging && "opacity-0",
            isPreviewPane &&
              "border border-primary/35 border-dashed bg-primary/[0.04] shadow-[inset_0_0_0_1px_rgba(59,130,246,0.08)]"
          )}
          data-slot="workspace-pane-surface"
          onClick={onFocus}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          {isPreviewPane ? (
            <div className="flex h-full min-h-0 flex-1 items-center justify-center px-6 text-center text-muted-foreground/70 text-sm">
              Drop to open here
            </div>
          ) : (
            <>
              <div
                className={cn(
                  "min-w-0",
                  isMultiPane &&
                    "cursor-grab select-none active:cursor-grabbing"
                )}
                draggable={isMultiPane}
                onDragEnd={onDragEnd}
                onDragStart={(event) => {
                  if (isInteractiveHeaderTarget(event.target)) {
                    event.preventDefault();
                    return;
                  }
                  onDragStart(event);
                }}
              >
                {isMultiPane ? (
                  <PaneHeader
                    compact={isCompact}
                    paneId={pane.id}
                    trailingActions={showPaneMenuInHeader ? paneMenu : null}
                  />
                ) : (
                  <WorkspaceHeader
                    className="border-b-0"
                    compact={isCompact}
                    paneId={pane.id}
                    trailingActions={showPaneMenuInHeader ? paneMenu : null}
                  />
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-hidden">
                <WorkspacePaneInteractionBoundary>
                  <WorkspacePaneScene
                    paneId={pane.id}
                    pathname={pane.route.pathname}
                    search={pane.route.search}
                  />
                </WorkspacePaneInteractionBoundary>
              </div>
            </>
          )}
          {dropRegion ? (
            <div className="pointer-events-none absolute inset-0 z-30 p-2">
              <div
                className={cn(
                  "absolute transition-[inset,width,height,background-color,border-color,opacity] duration-100 ease-out",
                  dropRegion === "center"
                    ? "rounded-md border border-primary/45 bg-primary/[0.035]"
                    : "rounded-sm bg-primary"
                )}
                style={getDropIndicatorStyle(dropRegion)}
              />
            </div>
          ) : null}
        </div>
      </WorkspacePaneProvider>
    </div>
  );
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
          className="workspace-pane-panel-group min-h-0 flex-1"
          direction="vertical"
          key={buildRowLayoutKey(paneRows)}
          onLayout={handleRowLayout}
        >
          {paneRows.map((row, rowIndex) => (
            <Fragment key={row.id}>
              <Panel defaultSize={row.size} minSize={18} order={rowIndex + 1}>
                <PanelGroup
                  className="workspace-pane-panel-group h-full min-w-0"
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
