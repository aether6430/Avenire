const PENDING_BROWSER_NAVIGATION_TTL_MS = 2000;

let pendingWorkspaceBrowserNavigation:
  | {
      href: string;
      timestamp: number;
    }
  | null = null;

function isPendingBrowserNavigationFresh() {
  return (
    pendingWorkspaceBrowserNavigation !== null &&
    Date.now() - pendingWorkspaceBrowserNavigation.timestamp <=
      PENDING_BROWSER_NAVIGATION_TTL_MS
  );
}

function clearStalePendingWorkspaceBrowserNavigation() {
  if (
    pendingWorkspaceBrowserNavigation !== null &&
    !isPendingBrowserNavigationFresh()
  ) {
    pendingWorkspaceBrowserNavigation = null;
  }
}

export function markPendingWorkspaceBrowserNavigation(href: string) {
  pendingWorkspaceBrowserNavigation = {
    href,
    timestamp: Date.now(),
  };
}

export function shouldDeferWorkspacePaneBrowserReplace({
  browserHref,
  nextHref,
}: {
  browserHref: string;
  nextHref: string;
}) {
  clearStalePendingWorkspaceBrowserNavigation();

  return (
    pendingWorkspaceBrowserNavigation?.href === nextHref &&
    browserHref !== nextHref
  );
}

export function shouldLetBrowserRouteDrivePaneSync({
  browserHref,
  nextHref,
  previousBrowserHref,
}: {
  browserHref: string;
  nextHref: string;
  previousBrowserHref: string | null;
}) {
  if (nextHref === browserHref) {
    return false;
  }

  return previousBrowserHref === null || previousBrowserHref !== browserHref;
}

export function consumePendingWorkspaceBrowserNavigation(href: string) {
  clearStalePendingWorkspaceBrowserNavigation();

  if (pendingWorkspaceBrowserNavigation?.href !== href) {
    return false;
  }

  pendingWorkspaceBrowserNavigation = null;
  return true;
}

export function resetPendingWorkspaceBrowserNavigationForTest() {
  pendingWorkspaceBrowserNavigation = null;
}
