"use client";

import {
  ArrowsSplit,
  Columns,
  DotsThree as MoreHorizontal,
  X,
} from "@phosphor-icons/react";
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
  type ReactNode,
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
import { WorkspaceFilesRootPageClient } from "@/components/files/workspace-files-root-page-client";
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

const COMPACT_PANE_WIDTH = 900;
type PaneDropRegion = "center" | "left" | "right";

function createTransparentDragImage() {
  if (typeof document === "undefined") {
    return null;
  }

  const pixel = document.createElement("canvas");
  pixel.width = 1;
  pixel.height = 1;
  return pixel;
}

function isInteractiveHeaderTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(target.closest("button, a, input, select, textarea, [role='menuitem']"))
  );
}

function getPaneDropRegion(
  event: DragEvent<HTMLElement>,
  bounds: DOMRect
): PaneDropRegion {
  const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
  if (x <= 0.22) {
    return "left";
  }
  if (x >= 0.78) {
    return "right";
  }

  return "center";
}

function getPaneSplitDirection() {
  return "horizontal" as const;
}

function getPaneSplitPlacement(region: PaneDropRegion) {
  return region === "left" ? "before" : "after";
}

function getDropIndicatorStyle(region: PaneDropRegion) {
  switch (region) {
    case "left":
      return { height: "calc(100% - 1rem)", inset: "0.5rem auto 0.5rem 0.5rem", width: "0.35rem" };
    case "right":
      return { height: "calc(100% - 1rem)", inset: "0.5rem 0.5rem 0.5rem auto", width: "0.35rem" };
    case "center":
    default:
      return { height: "calc(100% - 1rem)", inset: "0.5rem", width: "calc(100% - 1rem)" };
  }
}

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

  const filesRootMatch = pathname.match(/^\/workspace\/files(?:\/([^/?#]+))?$/);
  if (pathname === "/workspace/files" || filesRootMatch?.[1]) {
    return (
      <WorkspaceFilesRootPageClient
        preferredWorkspaceUuid={filesRootMatch?.[1] ?? undefined}
      />
    );
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

function WorkspacePaneSurface({
  dropRegion,
  isActive,
  isDragging,
  isMultiPane,
  onClose,
  onDragEnd,
  onDragStart,
  onDrop,
  onDragOver,
  onDragLeave,
  onFocus,
  onSplitHorizontal,
  pane,
}: {
  dropRegion: PaneDropRegion | null;
  isActive: boolean;
  isDragging: boolean;
  isMultiPane: boolean;
  onClose: () => void;
  onDragEnd: () => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onFocus: () => void;
  onSplitHorizontal: () => void;
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
  const showPaneMenuInHeader = !pane.route.pathname.startsWith("/workspace/files/");
  const paneMenu = isMultiPane ? (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button
            aria-label="Pane actions"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground shadow-sm transition hover:bg-muted/70 hover:text-foreground"
            type="button"
          />
        }
      >
        <MoreHorizontal className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5">
        <DropdownMenuItem onClick={onSplitHorizontal}>
          <Columns className="mr-2 size-4" />
          Split right
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
  ) : null;

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
            "relative flex h-full min-w-0 flex-col overflow-hidden border-r border-border/70 bg-background transition-[opacity,transform,box-shadow] duration-200 ease-out",
            isActive ? "ring-1 ring-inset ring-border/90" : "ring-0",
            isDragging && "opacity-45"
          )}
          onClick={onFocus}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
        >
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
          {dropRegion ? (
            <div className="pointer-events-none absolute inset-0 z-30 p-2">
              <div
                className={cn(
                  "absolute shadow-[0_0_0_1px_rgba(59,130,246,0.22),0_12px_28px_rgba(59,130,246,0.22)]",
                  dropRegion === "center"
                    ? "rounded-2xl border border-primary/35 bg-primary/10"
                    : "rounded-full bg-primary/85"
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
  const movePaneToSplit = useWorkspacePaneStore((state) => state.movePaneToSplit);
  const reorderPanes = useWorkspacePaneStore((state) => state.reorderPanes);
  const setPaneSizes = useWorkspacePaneStore((state) => state.setPaneSizes);
  const syncActivePaneFromBrowser = useWorkspacePaneStore(
    (state) => state.syncActivePaneFromBrowser
  );
  const setPaneRoute = useWorkspacePaneStore((state) => state.setPaneRoute);
  const setActiveHeaderPaneId = useHeaderStore((state) => state.setActivePaneId);
  const [draggedPaneId, setDraggedPaneId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    paneId: string;
    region: PaneDropRegion;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pendingBrowserSyncRef = useRef<string | null>(null);
  const dragGhostImageRef = useRef<HTMLCanvasElement | null>(null);

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

  useEffect(() => {
    dragGhostImageRef.current = createTransparentDragImage();
  }, []);

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
        const rightSize = Math.max(20, startingSizes[index + 1]! - deltaPercent);
        const adjustedTotal = leftSize + rightSize;
        const fixedLeft = (leftSize / adjustedTotal) * (startingSizes[index]! + startingSizes[index + 1]!);
        const fixedRight = (rightSize / adjustedTotal) * (startingSizes[index]! + startingSizes[index + 1]!);
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

  const handlePaneDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, targetPaneId: string) => {
      const targetBounds = event.currentTarget.getBoundingClientRect();
      const region = getPaneDropRegion(event, targetBounds);
      const droppedHref = getWorkspacePaneDragHref(event.dataTransfer);
      if (droppedHref) {
        event.preventDefault();
        if (region === "center") {
          focusPane(targetPaneId);
          setPaneRoute(targetPaneId, buildRouteState(droppedHref));
        } else {
          openPane(droppedHref, {
            sourcePaneId: targetPaneId,
            splitDirection: getPaneSplitDirection(),
            splitPlacement: getPaneSplitPlacement(region),
          });
        }
        setDraggedPaneId(null);
        setDropPreview(null);
        return;
      }

      if (draggedPaneId && draggedPaneId !== targetPaneId) {
        event.preventDefault();
        if (region === "center") {
          reorderPanes(draggedPaneId, targetPaneId);
        } else {
          movePaneToSplit(draggedPaneId, targetPaneId, {
            splitDirection: getPaneSplitDirection(),
            splitPlacement: getPaneSplitPlacement(region),
          });
        }
        setDraggedPaneId(null);
        setDropPreview(null);
      }
    },
    [
      draggedPaneId,
      focusPane,
      movePaneToSplit,
      openPane,
      reorderPanes,
      setPaneRoute,
    ]
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

  const rowPanes = panes;
  const rowDropTargetId = rowPanes[0]?.id ?? null;

  return (
    <div className="flex h-full w-full flex-col bg-background" ref={containerRef}>
      <div
        className="flex h-full min-w-0"
        onDragOver={(event) => {
          if (
            rowDropTargetId &&
            (hasWorkspacePaneDragHref(event.dataTransfer) || draggedPaneId)
          ) {
            event.preventDefault();
            event.dataTransfer.dropEffect = draggedPaneId ? "move" : "copy";
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
                isDragging={pane.id === draggedPaneId}
                isMultiPane={isMultiPane}
                dropRegion={
                  dropPreview?.paneId === pane.id ? dropPreview.region : null
                }
                onClose={() => closePane(pane.id)}
                onDragEnd={() => {
                  setDraggedPaneId(null);
                  setDropPreview(null);
                }}
                onDragStart={(event) => {
                  const dragImage = dragGhostImageRef.current;
                  if (dragImage) {
                    event.dataTransfer.setDragImage(dragImage, 0, 0);
                  }
                  event.dataTransfer.effectAllowed = "move";
                  setDraggedPaneId(pane.id);
                }}
                onDragLeave={() => {
                  setDropPreview((current) =>
                    current?.paneId === pane.id ? null : current
                  );
                }}
                onDragOver={(event) => {
                  if (hasWorkspacePaneDragHref(event.dataTransfer) || draggedPaneId) {
                    event.preventDefault();
                    if (draggedPaneId === pane.id) {
                      setDropPreview((current) =>
                        current?.paneId === pane.id ? null : current
                      );
                      return;
                    }
                    event.dataTransfer.dropEffect = draggedPaneId ? "move" : "copy";
                    setDropPreview({
                      paneId: pane.id,
                      region: getPaneDropRegion(
                        event,
                        event.currentTarget.getBoundingClientRect()
                      ),
                    });
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
                    startPaneResize(rowPanes[0]!.rowId, paneIndex, event.clientX);
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
