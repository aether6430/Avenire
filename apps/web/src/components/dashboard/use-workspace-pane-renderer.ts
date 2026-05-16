"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWorkspacePaneBrowserSync } from "@/components/dashboard/use-workspace-pane-browser-sync";
import { useWorkspacePaneInteractions } from "@/components/dashboard/use-workspace-pane-interactions";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import type { RenderablePane } from "@/components/dashboard/workspace-pane-renderer-model";
import { useIsMobile } from "@/hooks/use-mobile";
import { useHeaderStore } from "@/stores/header-store";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

export function useWorkspacePaneRenderer() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { status, workspace } = useWorkspaceBootstrap();
  const panes = useWorkspacePaneStore((state) => state.panes);
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const ensureInitialized = useWorkspacePaneStore(
    (state) => state.ensureInitialized
  );
  const closePane = useWorkspacePaneStore((state) => state.closePane);
  const focusPane = useWorkspacePaneStore((state) => state.focusPane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const movePaneToSplit = useWorkspacePaneStore(
    (state) => state.movePaneToSplit
  );
  const reorderPanes = useWorkspacePaneStore((state) => state.reorderPanes);
  const setPaneSizes = useWorkspacePaneStore((state) => state.setPaneSizes);
  const syncActivePaneFromBrowser = useWorkspacePaneStore(
    (state) => state.syncActivePaneFromBrowser
  );
  const setPaneRoute = useWorkspacePaneStore((state) => state.setPaneRoute);
  const setActiveHeaderPaneId = useHeaderStore(
    (state) => state.setActivePaneId
  );
  const { browserRoute } = useWorkspacePaneBrowserSync({
    activePaneId,
    ensureInitialized,
    panes,
    pathname,
    router,
    searchParams,
    setActiveHeaderPaneId,
    syncActivePaneFromBrowser,
  });
  const interactions = useWorkspacePaneInteractions({
    focusPane,
    movePaneToSplit,
    openPane,
    panes: panes as RenderablePane[],
    reorderPanes,
    setPaneRoute,
    setPaneSizes,
  });
  const {
    containerRef,
    draggedPaneId,
    dropPreview,
    handleContainerDragLeave,
    handleContainerDragOver,
    handleContainerDrop,
    handlePaneDragEnd,
    handlePaneDragLeave,
    handlePaneDragOver,
    handlePaneDragStart,
    handlePaneDrop,
    rowDropTargetId,
    rowPanes,
    startPaneResize,
  } = interactions;

  return {
    activePaneId,
    browserRoute,
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
    isMobile,
    openPane,
    panes,
    rowDropTargetId,
    rowPanes,
    startPaneResize,
    status,
    workspace,
  };
}
