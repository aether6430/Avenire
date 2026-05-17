import type { Route } from "next";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { WorkspacePaneRouteState } from "@/lib/workspace-pane-model";
import {
  buildRouteState,
  isInternalWorkspaceHref,
} from "@/lib/workspace-pane-model";

export interface WorkspacePaneContextValue {
  isActive: boolean;
  isCompact: boolean;
  paneId: string;
  route: WorkspacePaneRouteState;
}

interface WorkspacePaneStoreApi {
  focusPane: (paneId: string) => void;
  openPane: (
    href: string,
    options?: { sourcePaneId?: string | undefined }
  ) => void;
  setPaneRoute: (
    paneId: string,
    route: WorkspacePaneRouteState,
    options?: { replace?: boolean }
  ) => void;
}

export function navigateWorkspacePane(
  router: AppRouterInstance,
  pane: WorkspacePaneContextValue,
  store: WorkspacePaneStoreApi,
  href: string,
  options?: { openInNewPane?: boolean; replace?: boolean; scroll?: boolean }
) {
  const openInNewPane = options?.openInNewPane ?? false;
  const replace = options?.replace ?? false;
  const scroll = options?.scroll ?? false;
  const route = buildRouteState(href);

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

export function createPaneRouter(
  router: AppRouterInstance,
  pane: WorkspacePaneContextValue,
  store: WorkspacePaneStoreApi
) {
  return {
    prefetch: async (_href: Route) => undefined,
    push: (href: Route, options?: { scroll?: boolean }) => {
      navigateWorkspacePane(router, pane, store, href, {
        scroll: options?.scroll,
      });
    },
    refresh: () => undefined,
    replace: (href: Route, options?: { scroll?: boolean }) => {
      navigateWorkspacePane(router, pane, store, href, {
        replace: true,
        scroll: options?.scroll,
      });
    },
  };
}

export function createWorkspaceSurfaceNavigator(input: {
  activePaneId: string | null;
  focusPane: (paneId: string) => void;
  openPane: (
    href: string,
    options?: { sourcePaneId?: string | undefined }
  ) => void;
  panesEnabled: boolean;
  router: AppRouterInstance;
  setPaneRoute: (
    paneId: string,
    route: WorkspacePaneRouteState,
    options?: { replace?: boolean }
  ) => void;
}) {
  return {
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

      if (input.panesEnabled && openInNewPane) {
        input.openPane(`${route.pathname}${route.search}`, {
          sourcePaneId: input.activePaneId ?? undefined,
        });
        return;
      }

      if (input.panesEnabled && input.activePaneId) {
        input.focusPane(input.activePaneId);
        input.setPaneRoute(input.activePaneId, route, { replace });
      }

      const nextHref = `${route.pathname}${route.search}` as Route;
      if (replace) {
        input.router.replace(nextHref, { scroll });
        return;
      }
      input.router.push(nextHref, { scroll });
    },
  };
}

export function findNavigableAnchor(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  const anchor = target.closest("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) {
    return null;
  }

  const href = anchor.getAttribute("href");
  if (!(href && isInternalWorkspaceHref(href))) {
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
