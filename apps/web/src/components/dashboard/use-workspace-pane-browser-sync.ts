"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  consumePendingWorkspaceBrowserNavigation,
  shouldDeferWorkspacePaneBrowserReplace,
  shouldLetBrowserRouteDrivePaneSync,
  shouldSkipInitialHydratedWorkspacePaneSync,
} from "@/lib/workspace-pane-browser-navigation";
import { buildRouteState } from "@/lib/workspace-panes";
import { useWorkspacePaneStore } from "@/stores/workspacePaneStore";

export function useWorkspacePaneBrowserSync({
  activePaneId,
  ensureInitialized,
  panes,
  pathname,
  router,
  searchParams,
  setActiveHeaderPaneId,
  syncActivePaneFromBrowser,
}: {
  activePaneId: string | null;
  ensureInitialized: (route: { pathname: string; search: string }) => void;
  panes: Array<{
    id: string;
    route: {
      pathname: string;
      search: string;
    };
  }>;
  pathname: string;
  router: AppRouterInstance;
  searchParams: ReadonlyURLSearchParams;
  setActiveHeaderPaneId: (paneId: string | null) => void;
  syncActivePaneFromBrowser: (route: {
    pathname: string;
    search: string;
  }) => void;
}) {
  const pendingBrowserSyncRef = useRef<string | null>(null);
  const previousBrowserHrefRef = useRef<string | null>(null);
  const initialHydratedRouteHandledRef = useRef(false);
  const [paneStoreHydrated, setPaneStoreHydrated] = useState(() =>
    useWorkspacePaneStore.persist.hasHydrated()
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
    if (!paneStoreHydrated) {
      return;
    }

    if (
      shouldSkipInitialHydratedWorkspacePaneSync({
        hasHandledInitialHydratedRoute: initialHydratedRouteHandledRef.current,
        paneCount: panes.length,
      })
    ) {
      initialHydratedRouteHandledRef.current = true;
      return;
    }

    initialHydratedRouteHandledRef.current = true;

    const browserHref = `${browserRoute.pathname}${browserRoute.search}`;
    if (consumePendingWorkspaceBrowserNavigation(browserHref)) {
      if (pendingBrowserSyncRef.current === browserHref) {
        pendingBrowserSyncRef.current = null;
      }
      return;
    }

    if (pendingBrowserSyncRef.current === browserHref) {
      pendingBrowserSyncRef.current = null;
      return;
    }

    syncActivePaneFromBrowser(browserRoute);
  }, [
    browserRoute,
    paneStoreHydrated,
    panes.length,
    syncActivePaneFromBrowser,
  ]);

  useEffect(() => {
    if (!paneStoreHydrated) {
      return;
    }

    const activePane = panes.find((pane) => pane.id === activePaneId);
    if (!activePane) {
      return;
    }

    const nextHref = `${activePane.route.pathname}${activePane.route.search}`;
    const browserHref = `${browserRoute.pathname}${browserRoute.search}`;
    const previousBrowserHref = previousBrowserHrefRef.current;
    previousBrowserHrefRef.current = browserHref;

    if (
      shouldLetBrowserRouteDrivePaneSync({
        browserHref,
        nextHref,
        previousBrowserHref,
      })
    ) {
      return;
    }

    if (
      shouldDeferWorkspacePaneBrowserReplace({
        browserHref,
        nextHref,
      })
    ) {
      return;
    }

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
    paneStoreHydrated,
    panes,
    router,
  ]);

  useEffect(() => {
    setActiveHeaderPaneId(activePaneId);
  }, [activePaneId, setActiveHeaderPaneId]);

  return { browserRoute };
}
