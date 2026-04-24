"use client";

import {
  ArrowsOutCardinal,
  ArrowsSplit,
  Columns,
  DotsThree,
  DotsSixVertical,
  Rows,
  X,
} from "@phosphor-icons/react";
import { Button } from "@avenire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@avenire/ui/components/dropdown-menu";
import { cn } from "@avenire/ui/lib/utils";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type DragEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { FlashcardSetPageClient } from "@/components/flashcards/set-detail-page";
import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceHeader } from "@/components/dashboard/workspace-header";
import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildRouteState,
  getWorkspacePaneDragHref,
  hasWorkspacePaneDragHref,
  WorkspacePaneInteractionBoundary,
  WorkspacePaneProvider,
} from "@/lib/workspace-panes";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { useHeaderStore } from "@/stores/header-store";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";
import type { Route } from "next";

const COMPACT_PANE_WIDTH = 900;

function WorkspacePaneScene({
  paneId,
  pathname,
  search,
}: {
  paneId: string;
  pathname: string;
  search: string;
}) {
  const searchParams = useMemo(
    () => new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );

  if (pathname === "/workspace") {
    return <WorkspaceOverviewPageClient />;
  }

  if (pathname === "/workspace/tasks") {
    return <WorkspaceTasksPageClient />;
  }

  if (pathname === "/workspace/flashcards") {
    return <WorkspaceFlashcardsPageClient />;
  }

  const chatMatch = pathname.match(/^\/workspace\/chats\/([^/?#]+)$/);
  if (pathname === "/workspace/chats" || chatMatch) {
    return <WorkspaceChatRoutePageClient slug={chatMatch?.[1] ?? undefined} />;
  }

  const fileMatch = pathname.match(
    /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)$/
  );
  if (fileMatch?.[1] && fileMatch?.[2]) {
    return (
      <WorkspaceFolderRoutePageClient
        folderUuid={fileMatch[2]}
        workspaceUuid={fileMatch[1]}
      />
    );
  }

  const flashcardSetMatch = pathname.match(/^\/workspace\/flashcards\/([^/?#]+)$/);
  if (flashcardSetMatch?.[1]) {
    return (
      <FlashcardSetPageClient
        autoStudy={searchParams.get("study") === "1"}
        drillFilters={searchParams.getAll("drill")}
        setId={flashcardSetMatch[1]}
      />
    );
  }

  return (
    <WorkspaceRoutePlaceholder
      label={`Unsupported workspace route in pane ${paneId}.`}
    />
  );
}

function PaneHeader({
  compact,
  onSplitHorizontal,
  onSplitVertical,
}: {
  compact: boolean;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
}) {
  return (
    <WorkspaceHeader
      className="border-b-0"
      compact={compact}
      trailingActions={
        <DropdownMenu>
          <DropdownMenuTrigger
            className="inline-flex"
            render={
              <Button
                aria-label="Split pane"
                className="size-7 shrink-0 rounded-md text-muted-foreground"
                size="icon"
                type="button"
                variant="ghost"
              >
                <ArrowsSplit className="size-4" />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-1.5">
            <DropdownMenuItem onClick={onSplitHorizontal}>
              <Columns className="mr-2 size-4" />
              Split right
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSplitVertical}>
              <Rows className="mr-2 size-4" />
              Split down
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );
}

function WorkspacePaneSurface({
  isActive,
  isMultiPane,
  onClose,
  onDragEnd,
  onDragStart,
  onDrop,
  onDragOver,
  onFocus,
  onSplitHorizontal,
  onSplitVertical,
  pane,
}: {
  isActive: boolean;
  isMultiPane: boolean;
  onClose: () => void;
  onDragEnd: () => void;
  onDragStart: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onFocus: () => void;
  onSplitHorizontal: () => void;
  onSplitVertical: () => void;
  pane: {
    id: string;
    route: {
      pathname: string;
      search: string;
    };
    rowId: string;
    size: number;
  };
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

  return (
    <div
      className="min-w-0 w-full"
      ref={surfaceRef}
    >
      <WorkspacePaneProvider
        isActive={isActive}
        isCompact={isCompact}
        paneId={pane.id}
        route={pane.route}
      >
        <div
          className={cn(
            "flex h-full min-w-0 flex-col overflow-hidden border-r border-border/70 bg-background",
            isActive ? "ring-1 ring-inset ring-border/90" : "ring-0"
          )}
          onClick={onFocus}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
          <div className="flex items-center border-b border-border/60">
            {isMultiPane ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="flex h-11 shrink-0 cursor-pointer items-center pl-2 pr-1 text-muted-foreground hover:text-foreground"
                      type="button"
                    >
                      <DotsSixVertical className="size-4" />
                    </button>
                  }
                />
                <DropdownMenuContent align="start" className="w-48 rounded-xl p-1.5">
                  <DropdownMenuItem onClick={onSplitHorizontal}>
                    <Columns className="mr-2 size-4" />
                    Split right
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onSplitVertical}>
                    <Rows className="mr-2 size-4" />
                    Split down
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={onClose}
                  >
                    <X className="mr-2 size-4" />
                    Close pane
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {isMultiPane ? (
              <PaneHeader
                compact={isCompact}
                onSplitHorizontal={onSplitHorizontal}
                onSplitVertical={onSplitVertical}
              />
            ) : (
              <WorkspaceHeader
                className="border-b-0"
                compact={isCompact}
                paneId={pane.id}
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
        </div>
      </WorkspacePaneProvider>
    </div>
  );
}

export function WorkspacePaneRenderer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { workspace } = useWorkspaceBootstrap();
  const panes = useWorkspacePaneStore((state) => state.panes);
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const ensureInitialized = useWorkspacePaneStore(
    (state) => state.ensureInitialized
  );
  const closePane = useWorkspacePaneStore((state) => state.closePane);
  const focusPane = useWorkspacePaneStore((state) => state.focusPane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const reorderPanes = useWorkspacePaneStore((state) => state.reorderPanes);
  const rows = useWorkspacePaneStore((state) => state.rows);
  const setPaneSizes = useWorkspacePaneStore((state) => state.setPaneSizes);
  const setRowSizes = useWorkspacePaneStore((state) => state.setRowSizes);
  const syncActivePaneFromBrowser = useWorkspacePaneStore(
    (state) => state.syncActivePaneFromBrowser
  );
  const setPaneRoute = useWorkspacePaneStore((state) => state.setPaneRoute);
  const setActiveHeaderPaneId = useHeaderStore((state) => state.setActivePaneId);
  const [draggedPaneId, setDraggedPaneId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingBrowserSyncRef = useRef<string | null>(null);

  const browserRoute = useMemo(
    () => buildRouteState(
      `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`
    ),
    [pathname, searchParams]
  );

  useEffect(() => {
    ensureInitialized(browserRoute);
  }, [browserRoute, ensureInitialized]);

  useEffect(() => {
    const browserHref = `${browserRoute.pathname}${browserRoute.search}`;
    if (pendingBrowserSyncRef.current === browserHref) {
      pendingBrowserSyncRef.current = null;
      return;
    }

    syncActivePaneFromBrowser(browserRoute);
  }, [browserRoute, syncActivePaneFromBrowser]);

  useEffect(() => {
    const activePane = panes.find((pane) => pane.id === activePaneId);
    if (!activePane) {
      return;
    }

    const nextHref = `${activePane.route.pathname}${activePane.route.search}`;
    const browserHref = `${browserRoute.pathname}${browserRoute.search}`;
    if (nextHref === browserHref) {
      if (pendingBrowserSyncRef.current === browserHref) {
        pendingBrowserSyncRef.current = null;
      }
      return;
    }

    pendingBrowserSyncRef.current = nextHref;
    router.replace(nextHref as never);
  }, [activePaneId, browserRoute.pathname, browserRoute.search, panes, router]);

  useEffect(() => {
    setActiveHeaderPaneId(activePaneId);
  }, [activePaneId, setActiveHeaderPaneId]);

  const startResize = useCallback(
    (
      kind: "row" | "pane",
      targetId: string,
      index: number,
      startClientX: number,
      startClientY: number
    ) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const startingSizes =
        kind === "row"
          ? rows.map((row) => row.size)
          : panes.filter((pane) => pane.rowId === targetId).map((pane) => pane.size);
      const bounds = container.getBoundingClientRect();
      const containerSize = kind === "row" ? bounds.height : bounds.width;
      if (containerSize <= 0) {
        return;
      }

      const handlePointerMove = (event: PointerEvent) => {
        const delta =
          kind === "row" ? event.clientY - startClientY : event.clientX - startClientX;
        const deltaPercent = (delta / containerSize) * 100;
        const leftSize = Math.max(20, startingSizes[index]! + deltaPercent);
        const rightSize = Math.max(20, startingSizes[index + 1]! - deltaPercent);
        const adjustedTotal = leftSize + rightSize;
        const fixedLeft = (leftSize / adjustedTotal) * (startingSizes[index]! + startingSizes[index + 1]!);
        const fixedRight = (rightSize / adjustedTotal) * (startingSizes[index]! + startingSizes[index + 1]!);
        const nextSizes = [...startingSizes];
        nextSizes[index] = fixedLeft;
        nextSizes[index + 1] = fixedRight;
        if (kind === "row") {
          setRowSizes(nextSizes);
        } else {
          setPaneSizes(targetId, nextSizes);
        }
      };

      const handlePointerUp = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [panes, rows, setPaneSizes, setRowSizes]
  );

  const handlePaneDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, targetPaneId: string) => {
      const droppedHref = getWorkspacePaneDragHref(event.dataTransfer);
      if (droppedHref) {
        event.preventDefault();
        focusPane(targetPaneId);
        setPaneRoute(targetPaneId, buildRouteState(droppedHref));
        setDraggedPaneId(null);
        return;
      }

      if (draggedPaneId && draggedPaneId !== targetPaneId) {
        event.preventDefault();
        reorderPanes(draggedPaneId, targetPaneId);
        setDraggedPaneId(null);
      }
    },
    [draggedPaneId, focusPane, reorderPanes, setPaneRoute]
  );

  if (!workspace || panes.length === 0) {
    return <WorkspaceRoutePlaceholder label="Loading workspace..." />;
  }

  if (isMobile) {
    const mobilePaneId = activePaneId ?? panes[0]?.id ?? "mobile-pane";
    return (
      <WorkspacePaneProvider
        isActive
        isCompact
        paneId={mobilePaneId}
        route={browserRoute}
      >
        <div className="flex h-full min-w-0 flex-col bg-background">
          <WorkspaceHeader
            className="border-b border-border/60"
            compact
            overlay
            paneId={mobilePaneId}
          />
          <div className="min-h-0 flex-1 overflow-hidden">
            <WorkspacePaneInteractionBoundary>
              <WorkspacePaneScene
                paneId={mobilePaneId}
                pathname={browserRoute.pathname}
                search={browserRoute.search}
              />
            </WorkspacePaneInteractionBoundary>
          </div>
        </div>
      </WorkspacePaneProvider>
    );
  }

  return (
    <div className="flex h-full w-full flex-col bg-background" ref={containerRef}>
      {rows.map((row, rowIndex) => {
        const rowPanes = panes.filter((pane) => pane.rowId === row.id);
        const rowDropTargetId = rowPanes[0]?.id ?? null;
        return (
          <div className="min-h-0" key={row.id} style={{ height: `${row.size}%` }}>
            <div
              className="flex h-full min-w-0"
              onDragOver={(event) => {
                if (
                  rowDropTargetId &&
                  (hasWorkspacePaneDragHref(event.dataTransfer) || draggedPaneId)
                ) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = draggedPaneId
                    ? "move"
                    : "copy";
                }
              }}
              onDrop={(event) => {
                if (rowDropTargetId) {
                  handlePaneDrop(event, rowDropTargetId);
                }
              }}
            >
              {rowPanes.map((pane, paneIndex) => {
                const isActive = pane.id === activePaneId;
                const isMultiPane = panes.length > 1;
                return (
                  <div
                    className="flex min-w-0 shrink-0"
                    key={pane.id}
                    style={{ width: `${pane.size}%` }}
                  >
                    <WorkspacePaneSurface
                      isActive={isActive}
                      isMultiPane={isMultiPane}
                      onClose={() => closePane(pane.id)}
                      onDragEnd={() => {
                        setDraggedPaneId(null);
                      }}
                      onDragStart={() => {
                        setDraggedPaneId(pane.id);
                      }}
                      onDragOver={(event) => {
                        if (
                          hasWorkspacePaneDragHref(event.dataTransfer) ||
                          draggedPaneId
                        ) {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = draggedPaneId
                            ? "move"
                            : "copy";
                        }
                      }}
                      onDrop={(event) => {
                        event.stopPropagation();
                        handlePaneDrop(event, pane.id);
                      }}
                      onFocus={() => focusPane(pane.id)}
                      onSplitHorizontal={() =>
                        openPane("/workspace", {
                          sourcePaneId: pane.id,
                          splitDirection: "horizontal",
                        })
                      }
                      onSplitVertical={() =>
                        openPane("/workspace", {
                          sourcePaneId: pane.id,
                          splitDirection: "vertical",
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
                          startResize(
                            "pane",
                            row.id,
                            paneIndex,
                            event.clientX,
                            event.clientY
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
            {rowIndex < rows.length - 1 ? (
              <div
                className="relative z-10 h-3 shrink-0 cursor-row-resize bg-border/35 transition-colors hover:bg-border/75"
                key={`${row.id}-row-resize`}
                onPointerDown={(event) => {
                  event.preventDefault();
                  startResize("row", row.id, rowIndex, event.clientX, event.clientY);
                }}
              >
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70">
                  <ArrowsSplit className="size-3.5 rotate-90" />
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
