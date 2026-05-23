"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { useWorkspacePaneBrowserSync } from "@/components/dashboard/use-workspace-pane-browser-sync";
import { useWorkspacePaneInteractions } from "@/components/dashboard/use-workspace-pane-interactions";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import {
  buildRenderablePaneRows,
  type RenderablePane,
  type RenderablePaneRow,
  shouldPersistWorkspacePanelLayout,
} from "@/components/dashboard/workspace-pane-renderer-model";
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
  const rows = useWorkspacePaneStore((state) => state.rows);
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
  const setRowSizes = useWorkspacePaneStore((state) => state.setRowSizes);
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
  } = interactions;
  const paneRows = useMemo(
    () =>
      buildRenderablePaneRows(
        rows,
        panes as RenderablePane[],
        dropPreview,
        draggedPaneId
      ),
    [rows, panes, dropPreview, draggedPaneId]
  );
  const handleRowLayout = (nextSizes: number[]) => {
    if (
      !shouldPersistWorkspacePanelLayout({
        currentSizes: paneRows.map((row) => row.size),
        draggedPaneId,
        hasPreviewPane: paneRows.some((row) =>
          row.panes.some((pane) => pane.isDropPreview)
        ),
        nextSizes,
      })
    ) {
      return;
    }

    setRowSizes(nextSizes);
  };

  const handlePaneLayout = (row: RenderablePaneRow, nextSizes: number[]) => {
    if (
      !shouldPersistWorkspacePanelLayout({
        currentSizes: row.panes.map((pane) => pane.size),
        draggedPaneId,
        hasPreviewPane: row.panes.some((pane) => pane.isDropPreview),
        nextSizes,
      })
    ) {
      return;
    }

    setPaneSizes(row.id, nextSizes);
  };

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
    handlePaneLayout,
    handleRowLayout,
    isMobile,
    openPane,
    panes,
    paneRows,
    paneCount: panes.length,
    status,
    workspace,
  };
}
