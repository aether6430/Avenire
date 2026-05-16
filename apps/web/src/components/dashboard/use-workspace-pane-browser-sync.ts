"use client";

import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ReadonlyURLSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef } from "react";
import { buildRouteState } from "@/lib/workspace-panes";

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

  const browserRoute = useMemo(
    () =>
      buildRouteState(
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

  return { browserRoute };
}
