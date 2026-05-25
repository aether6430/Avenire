"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  type DragEvent,
  type MouseEvent,
  type PropsWithChildren,
  use,
  useContext,
  useMemo,
} from "react";
import {
  buildRouteState,
  clearWorkspacePaneDragData,
  getWorkspacePaneDragHref,
  hasWorkspacePaneDragHref,
  isInternalWorkspaceHref,
  normalizeHref,
  setWorkspacePaneDragData,
} from "@/lib/workspace-pane-model";
import {
  createPaneRouter,
  createWorkspaceSurfaceNavigator,
  findNavigableAnchor,
  navigateWorkspacePane,
  type WorkspacePaneContextValue,
} from "@/lib/workspace-pane-runtime";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

const WorkspacePaneContext = createContext<WorkspacePaneContextValue | null>(
  null
);

export function WorkspacePaneProvider({
  children,
  isCompact,
  isActive,
  paneId,
  route,
}: PropsWithChildren<WorkspacePaneContextValue>) {
  const value = useMemo(
    () => ({ isActive, isCompact, paneId, route }),
    [isActive, isCompact, paneId, route]
  );

  return (
    <WorkspacePaneContext.Provider value={value}>
      {children}
    </WorkspacePaneContext.Provider>
  );
}

export function useCurrentWorkspacePane() {
  const context = useContext(WorkspacePaneContext);
  if (!context) {
    throw new Error("useCurrentWorkspacePane must be used within a pane.");
  }
  return context;
}

export function useCurrentWorkspacePaneCompact() {
  return useCurrentWorkspacePane().isCompact;
}

export function useOptionalCurrentWorkspacePane() {
  return useContext(WorkspacePaneContext);
}

export function usePanePathname() {
  return useCurrentWorkspacePane().route.pathname;
}

export function usePaneSearchParams() {
  const search = useCurrentWorkspacePane().route.search;
  return useMemo(
    () =>
      new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );
}

export function usePaneRouter() {
  const router = useRouter();
  const pane = useCurrentWorkspacePane();

  return useMemo(
    () => createPaneRouter(router, pane, useWorkspacePaneStore.getState()),
    [pane, router]
  );
}

export function useWorkspacePaneNavigation() {
  const router = useRouter();
  const pane = useCurrentWorkspacePane();

  return useMemo(
    () => ({
      navigate: (
        href: string,
        options?: {
          openInNewPane?: boolean;
          replace?: boolean;
          scroll?: boolean;
        }
      ) =>
        navigateWorkspacePane(
          router,
          pane,
          useWorkspacePaneStore.getState(),
          href,
          options
        ),
      openInNewPane: (href: string) =>
        navigateWorkspacePane(
          router,
          pane,
          useWorkspacePaneStore.getState(),
          href,
          { openInNewPane: true }
        ),
    }),
    [pane, router]
  );
}

export function useWorkspaceSurfaceNavigation(options?: {
  panesEnabled?: boolean;
}) {
  const router = useRouter();
  const panesEnabled = options?.panesEnabled ?? true;
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const focusPane = useWorkspacePaneStore((state) => state.focusPane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const setPaneRoute = useWorkspacePaneStore((state) => state.setPaneRoute);

  return useMemo(
    () =>
      createWorkspaceSurfaceNavigator({
        activePaneId,
        focusPane,
        openPane,
        panesEnabled,
        router,
        setPaneRoute,
      }),
    [activePaneId, focusPane, openPane, panesEnabled, router, setPaneRoute]
  );
}

export function WorkspacePaneInteractionBoundary({
  children,
}: PropsWithChildren) {
  const { navigate, openInNewPane } = useWorkspacePaneNavigation();

  const handleClickCapture = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = findNavigableAnchor(event.target);
    if (!anchor) {
      return;
    }

    const href = anchor.href;
    if (event.metaKey || event.ctrlKey || event.shiftKey) {
      return;
    }

    if (event.altKey) {
      event.preventDefault();
      openInNewPane(href);
      return;
    }

    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    navigate(href);
  };

  const handleContextMenuCapture = (event: MouseEvent<HTMLDivElement>) => {
    const anchor = findNavigableAnchor(event.target);
    if (!anchor) {
      return;
    }

    event.preventDefault();
    openInNewPane(anchor.href);
  };

  const handleDragStartCapture = (event: DragEvent<HTMLDivElement>) => {
    const anchor = findNavigableAnchor(event.target);
    if (!anchor) {
      return;
    }

    setWorkspacePaneDragData(event.dataTransfer, anchor.href);
  };

  return (
    <div
      className="contents"
      onClickCapture={handleClickCapture}
      onContextMenuCapture={handleContextMenuCapture}
      onDragStartCapture={handleDragStartCapture}
    >
      {children}
    </div>
  );
}

export function useOptionalWorkspacePane() {
  return use(WorkspacePaneContext);
}

export {
  buildRouteState,
  clearWorkspacePaneDragData,
  getWorkspacePaneDragHref,
  hasWorkspacePaneDragHref,
  isInternalWorkspaceHref,
  normalizeHref,
  setWorkspacePaneDragData,
};
export type {
  WorkspacePaneRecord,
  WorkspacePaneRouteState,
  WorkspacePaneSplitDirection,
} from "@/lib/workspace-pane-model";
