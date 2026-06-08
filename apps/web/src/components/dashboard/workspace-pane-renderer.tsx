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
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  ArrowsSplit,
  Columns,
  DotsThree as MoreHorizontal,
  X,
} from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Fragment,
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceChatRoutePageClient } from "@/components/dashboard/workspace-chat-route-page-client";
import { WorkspaceHeader } from "@/components/dashboard/workspace-header";
import { WorkspaceOverviewPageClient } from "@/components/dashboard/workspace-overview-page-client";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { WorkspaceFilesRootPageClient } from "@/components/files/workspace-files-root-page-client";
import { WorkspaceFolderRoutePageClient } from "@/components/files/workspace-folder-route-page-client";
import { FlashcardSetPageClient } from "@/components/flashcards/set-detail-page";
import { WorkspaceFlashcardsPageClient } from "@/components/flashcards/workspace-flashcards-page-client";
import { WorkspaceTasksPageClient } from "@/components/tasks/workspace-tasks-page-client";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  buildRouteState,
  WorkspacePaneInteractionBoundary,
  WorkspacePaneProvider,
} from "@/lib/workspace-panes";
import { useHeaderStore } from "@/stores/header-store";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

const COMPACT_PANE_WIDTH = 900;
const MIN_PANE_SIZE = 20;

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
    () =>
      new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
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

  const flashcardSetMatch = pathname.match(
    /^\/workspace\/flashcards\/([^/?#]+)$/
  );
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
  dropIndicator,
  isActive,
  isMultiPane,
  onClose,
  onFocus,
  onSplitHorizontal,
  pane,
}: {
  dropIndicator: "before" | "after" | null;
  isActive: boolean;
  isMultiPane: boolean;
  onClose: () => void;
  onFocus: () => void;
  onSplitHorizontal: () => void;
  pane: {
    id: string;
    route: {
      pathname: string;
      search: string;
    };
  };
}) {
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const { isOver, setNodeRef: setDropNodeRef } = useDroppable({
    data: { paneId: pane.id },
    id: pane.id,
  });
  const {
    attributes: dragAttributes,
    isDragging,
    listeners: dragListeners,
    setNodeRef: setDragNodeRef,
  } = useDraggable({
    data: { paneId: pane.id },
    disabled: !isMultiPane,
    id: pane.id,
  });
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

    const observer = new ResizeObserver(updateWidth);
    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, []);

  const isCompact = width > 0 && width < COMPACT_PANE_WIDTH;
  const showPaneMenuInHeader =
    !pane.route.pathname.startsWith("/workspace/files/");
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
      className="h-full min-h-0 w-full min-w-0"
      ref={(node) => {
        surfaceRef.current = node;
        setDropNodeRef(node);
      }}
    >
      <WorkspacePaneProvider
        isActive={isActive}
        isCompact={isCompact}
        paneId={pane.id}
        route={pane.route}
      >
        <div
          className={cn(
            "relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-background transition-[opacity,box-shadow] duration-150",
            isMultiPane && "border-border/70 border-r",
            isMultiPane && isActive
              ? "ring-1 ring-border/90 ring-inset"
              : "ring-0",
            isDragging && "opacity-55",
            isOver && !isDragging && "bg-primary/[0.025]"
          )}
          onClick={onFocus}
        >
          {dropIndicator ? (
            <div
              className={cn(
                "pointer-events-none absolute inset-y-2 z-40 w-1 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.16),0_0_18px_hsl(var(--primary)/0.35)] transition-all duration-150",
                dropIndicator === "before" ? "left-1" : "right-1"
              )}
            />
          ) : null}
          <div
            className={cn(
              isMultiPane && "cursor-grab touch-none active:cursor-grabbing"
            )}
            ref={setDragNodeRef}
            {...dragAttributes}
            {...dragListeners}
          >
            <PaneHeader
              compact={isCompact}
              paneId={pane.id}
              trailingActions={showPaneMenuInHeader ? paneMenu : null}
            />
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
  const setPaneSizes = useWorkspacePaneStore((state) => state.setPaneSizes);
  const syncActivePaneFromBrowser = useWorkspacePaneStore(
    (state) => state.syncActivePaneFromBrowser
  );
  const setActiveHeaderPaneId = useHeaderStore(
    (state) => state.setActivePaneId
  );
  const [paneStoreHydrated, setPaneStoreHydrated] = useState(() =>
    useWorkspacePaneStore.persist.hasHydrated()
  );
  const [dragPreview, setDragPreview] = useState<{
    activePaneId: string;
    overPaneId: string;
  } | null>(null);
  const pendingBrowserSyncRef = useRef<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const browserRoute = useMemo(
    () =>
      buildRouteState(
        `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`
      ),
    [pathname, searchParams]
  );

  useEffect(() => {
    if (paneStoreHydrated) {
      return;
    }

    const unsubscribe = useWorkspacePaneStore.persist.onFinishHydration(() => {
      setPaneStoreHydrated(true);
    });

    if (useWorkspacePaneStore.persist.hasHydrated()) {
      setPaneStoreHydrated(true);
    }

    return unsubscribe;
  }, [paneStoreHydrated]);

  useEffect(() => {
    if (!paneStoreHydrated) {
      return;
    }
    ensureInitialized(browserRoute);
  }, [browserRoute, ensureInitialized, paneStoreHydrated]);

  useEffect(() => {
    if (isMobile) {
      return;
    }
    if (!paneStoreHydrated) {
      return;
    }
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
  }, [
    activePaneId,
    browserRoute.pathname,
    browserRoute.search,
    isMobile,
    paneStoreHydrated,
    panes,
    router,
  ]);

  useEffect(() => {
    if (!(isMobile && paneStoreHydrated)) {
      return;
    }

    syncActivePaneFromBrowser(browserRoute);
  }, [browserRoute, isMobile, paneStoreHydrated, syncActivePaneFromBrowser]);

  useEffect(() => {
    setActiveHeaderPaneId(activePaneId);
  }, [activePaneId, setActiveHeaderPaneId]);

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
        <div className="flex h-full w-full flex-col bg-background">
          <WorkspaceHeader
            className="border-border/60 border-b"
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

  const rowId = panes[0]?.rowId;

  const handlePaneDragStart = (event: DragStartEvent) => {
    const activePaneId = String(event.active.id);
    setDragPreview({ activePaneId, overPaneId: activePaneId });
  };

  const handlePaneDragOver = (event: DragOverEvent) => {
    const activePaneId = String(event.active.id);
    const overPaneId = event.over ? String(event.over.id) : activePaneId;
    setDragPreview({ activePaneId, overPaneId });
  };

  const handlePaneDragEnd = (event: DragEndEvent) => {
    const draggedPaneId = String(event.active.id);
    const targetPaneId = event.over ? String(event.over.id) : null;
    setDragPreview(null);

    if (targetPaneId && draggedPaneId !== targetPaneId) {
      reorderPanes(draggedPaneId, targetPaneId);
      focusPane(draggedPaneId);
    }
  };

  const handlePaneDragCancel = () => {
    setDragPreview(null);
  };

  return (
    <DndContext
      onDragCancel={handlePaneDragCancel}
      onDragEnd={handlePaneDragEnd}
      onDragOver={handlePaneDragOver}
      onDragStart={handlePaneDragStart}
      sensors={sensors}
    >
      <div className="h-full min-h-0 w-full bg-background">
        <PanelGroup
          autoSaveId="avenire-workspace-panes"
          className="h-full min-h-0 min-w-0"
          direction="horizontal"
          onLayout={(sizes) => {
            if (rowId) {
              setPaneSizes(rowId, sizes);
            }
          }}
        >
          {panes.map((pane, paneIndex) => {
            const isActive = pane.id === activePaneId;
            const isMultiPane = panes.length > 1;
            const draggedPaneIndex = dragPreview
              ? panes.findIndex(
                  (candidate) => candidate.id === dragPreview.activePaneId
                )
              : -1;
            const overPaneIndex = dragPreview
              ? panes.findIndex(
                  (candidate) => candidate.id === dragPreview.overPaneId
                )
              : -1;
            const dropIndicator =
              dragPreview?.overPaneId === pane.id &&
              dragPreview.activePaneId !== pane.id &&
              draggedPaneIndex >= 0 &&
              overPaneIndex >= 0
                ? draggedPaneIndex < overPaneIndex
                  ? "after"
                  : "before"
                : null;

            return (
              <Fragment key={pane.id}>
                <Panel
                  className="h-full min-w-0"
                  defaultSize={pane.size}
                  id={pane.id}
                  minSize={MIN_PANE_SIZE}
                  order={paneIndex}
                >
                  <WorkspacePaneSurface
                    dropIndicator={dropIndicator}
                    isActive={isActive}
                    isMultiPane={isMultiPane}
                    onClose={() => closePane(pane.id)}
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
                </Panel>
                {paneIndex < panes.length - 1 ? (
                  <PanelResizeHandle className="group relative z-20 w-3 bg-border/35 transition-colors hover:bg-border/75 data-[resize-handle-active]:bg-border/90">
                    <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/70">
                      <ArrowsSplit className="size-3.5 transition-transform group-data-[resize-handle-active]:scale-110" />
                    </div>
                  </PanelResizeHandle>
                ) : null}
              </Fragment>
            );
          })}
        </PanelGroup>
      </div>
    </DndContext>
  );
}
