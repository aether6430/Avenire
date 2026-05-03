"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { Route } from "next";
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
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

export interface WorkspacePaneRouteState {
  pathname: string;
  search: string;
}

export interface WorkspacePaneRecord {
  id: string;
  route: WorkspacePaneRouteState;
  rowId: string;
  size: number;
}

export type WorkspacePaneSplitDirection = "horizontal" | "vertical";

const WORKSPACE_PANE_DRAG_MIME = "application/x-avenire-workspace-pane-link";
let activeWorkspacePaneDragHref: string | null = null;

interface WorkspacePaneContextValue {
  isActive: boolean;
  isCompact: boolean;
  paneId: string;
  route: WorkspacePaneRouteState;
}

const WorkspacePaneContext = createContext<WorkspacePaneContextValue | null>(
  null
);

function normalizeHref(href: string) {
  if (typeof window === "undefined") {
    return href;
  }

  const url = new URL(href, window.location.origin);
  return `${url.pathname}${url.search}`;
}

export function setWorkspacePaneDragData(
  dataTransfer: DataTransfer,
  href: string
) {
  const normalizedHref = normalizeHref(href);
  activeWorkspacePaneDragHref = normalizedHref;
  dataTransfer.effectAllowed = "copyMove";
  dataTransfer.setData(WORKSPACE_PANE_DRAG_MIME, normalizedHref);
  dataTransfer.setData("text/plain", normalizedHref);
  dataTransfer.setData("text/uri-list", normalizedHref);
}

export function getWorkspacePaneDragHref(
  dataTransfer: DataTransfer | null | undefined
) {
  if (!dataTransfer) {
    return null;
  }

  const href =
    dataTransfer.getData(WORKSPACE_PANE_DRAG_MIME) ||
    dataTransfer.getData("text/uri-list") ||
    dataTransfer.getData("text/plain") ||
    activeWorkspacePaneDragHref;

  if (!href || !isInternalWorkspaceHref(href)) {
    return null;
  }

  return normalizeHref(href);
}

export function clearWorkspacePaneDragData() {
  activeWorkspacePaneDragHref = null;
}

export function hasWorkspacePaneDragHref(
  dataTransfer: DataTransfer | null | undefined
) {
  return getWorkspacePaneDragHref(dataTransfer) !== null;
}

function isInternalWorkspaceHref(href: string) {
  if (!href) {
    return false;
  }

  const normalizedHref = normalizeHref(href);
  return normalizedHref.startsWith("/workspace");
}

function buildRouteState(href: string): WorkspacePaneRouteState {
  const normalizedHref = normalizeHref(href);
  const [pathname, search = ""] = normalizedHref.split("?");
  return {
    pathname: pathname || "/workspace",
    search: search ? `?${search}` : "",
  };
}

function navigatePane(
  router: AppRouterInstance,
  pane: WorkspacePaneContextValue,
  href: string,
  options?: { openInNewPane?: boolean; replace?: boolean; scroll?: boolean }
) {
  const openInNewPane = options?.openInNewPane ?? false;
  const replace = options?.replace ?? false;
  const scroll = options?.scroll ?? false;
  const route = buildRouteState(href);
  const store = useWorkspacePaneStore.getState();

  if (openInNewPane) {
    store.openPane(`${route.pathname}${route.search}`, {
      sourcePaneId: pane.paneId,
    });
    return;
  }

  store.focusPane(pane.paneId);
  store.setPaneRoute(pane.paneId, route, { replace });

  if (!pane.isActive) {
    return;
  }

  const nextHref = `${route.pathname}${route.search}` as Route;
  if (replace) {
    router.replace(nextHref, { scroll });
  } else {
    router.push(nextHref, { scroll });
  }
}

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
    () => new URLSearchParams(search.startsWith("?") ? search.slice(1) : search),
    [search]
  );
}

export function usePaneRouter() {
  const router = useRouter();
  const pane = useCurrentWorkspacePane();

  return useMemo(
    () => ({
      prefetch: async (_href: Route) => undefined,
      push: (href: Route, options?: { scroll?: boolean }) => {
        navigatePane(router, pane, href, { scroll: options?.scroll });
      },
      refresh: () => undefined,
      replace: (href: Route, options?: { scroll?: boolean }) => {
        navigatePane(router, pane, href, {
          replace: true,
          scroll: options?.scroll,
        });
      },
    }),
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
        options?: { openInNewPane?: boolean; replace?: boolean; scroll?: boolean }
      ) => navigatePane(router, pane, href, options),
      openInNewPane: (href: string) =>
        navigatePane(router, pane, href, { openInNewPane: true }),
    }),
    [pane, router]
  );
}

export function useWorkspaceSurfaceNavigation(options?: { panesEnabled?: boolean }) {
  const router = useRouter();
  const panesEnabled = options?.panesEnabled ?? true;
  const activePaneId = useWorkspacePaneStore((state) => state.activePaneId);
  const focusPane = useWorkspacePaneStore((state) => state.focusPane);
  const openPane = useWorkspacePaneStore((state) => state.openPane);
  const setPaneRoute = useWorkspacePaneStore((state) => state.setPaneRoute);

  return useMemo(
    () => ({
      navigate: (
        href: string,
        navigateOptions?: {
          openInNewPane?: boolean;
          replace?: boolean;
          scroll?: boolean;
        }
      ) => {
        const route = buildRouteState(href);
        const openInNewPane = navigateOptions?.openInNewPane ?? false;
        const replace = navigateOptions?.replace ?? false;
        const scroll = navigateOptions?.scroll ?? false;

        if (panesEnabled && openInNewPane) {
          openPane(`${route.pathname}${route.search}`, {
            sourcePaneId: activePaneId ?? undefined,
          });
          return;
        }

        if (panesEnabled && activePaneId) {
          focusPane(activePaneId);
          setPaneRoute(activePaneId, route, { replace });
        }

        const nextHref = `${route.pathname}${route.search}` as Route;
        if (replace) {
          router.replace(nextHref, { scroll });
          return;
        }
        router.push(nextHref, { scroll });
      },
    }),
    [activePaneId, focusPane, openPane, panesEnabled, router, setPaneRoute]
  );
}

function findNavigableAnchor(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  const href = anchor.getAttribute("href");
  if (!href || !isInternalWorkspaceHref(href)) {
    return null;
  }

  if (anchor.target && anchor.target !== "_self") {
    return null;
  }

  if (anchor.hasAttribute("download")) {
    return null;
  }

  return anchor;
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

export { buildRouteState, isInternalWorkspaceHref, normalizeHref };
