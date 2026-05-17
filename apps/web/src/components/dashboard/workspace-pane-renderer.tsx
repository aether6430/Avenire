"use client";

import dynamic from "next/dynamic";
import type { WorkspacePaneMobileLayoutProps } from "@/components/dashboard/workspace-pane-layout";
import { WorkspacePaneDesktopLayout } from "@/components/dashboard/workspace-pane-layout";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { useWorkspacePaneRenderer } from "./use-workspace-pane-renderer";

const WorkspacePaneMobileLayout = dynamic<WorkspacePaneMobileLayoutProps>(() =>
  import("@/components/dashboard/workspace-pane-layout").then(
    (module) => module.WorkspacePaneMobileLayout
  )
);

export function WorkspacePaneRenderer() {
  const runtime = useWorkspacePaneRenderer();

  if (runtime.status === "error") {
    return (
      <WorkspaceRoutePlaceholder
        label="Unable to load workspace."
        pending={false}
      />
    );
  }

  if (runtime.status === "ready" && !runtime.workspace) {
    return (
      <WorkspaceRoutePlaceholder
        label="Create a workspace to continue."
        pending={false}
      />
    );
  }

  if (!runtime.workspace || runtime.panes.length === 0) {
    return <WorkspaceRoutePlaceholder label="Loading workspace..." />;
  }

  if (runtime.isMobile) {
    const mobilePaneId =
      runtime.activePaneId ?? runtime.panes[0]?.id ?? "mobile-pane";
    return (
      <WorkspacePaneMobileLayout
        browserRoute={runtime.browserRoute}
        paneId={mobilePaneId}
      />
    );
  }

  return (
    <WorkspacePaneDesktopLayout
      activePaneId={runtime.activePaneId}
      closePane={runtime.closePane}
      containerRef={runtime.containerRef}
      draggedPaneId={runtime.draggedPaneId}
      dropPreview={runtime.dropPreview}
      focusPane={runtime.focusPane}
      handleContainerDragLeave={runtime.handleContainerDragLeave}
      handleContainerDragOver={runtime.handleContainerDragOver}
      handleContainerDrop={runtime.handleContainerDrop}
      handlePaneDragEnd={runtime.handlePaneDragEnd}
      handlePaneDragLeave={runtime.handlePaneDragLeave}
      handlePaneDragOver={runtime.handlePaneDragOver}
      handlePaneDragStart={runtime.handlePaneDragStart}
      handlePaneDrop={runtime.handlePaneDrop}
      openPane={runtime.openPane}
      paneCount={runtime.paneCount}
      paneRows={runtime.paneRows}
      startPaneResize={runtime.startPaneResize}
      startRowResize={runtime.startRowResize}
    />
  );
}
