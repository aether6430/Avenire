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

export function normalizeHref(href: string) {
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

  if (!(href && isInternalWorkspaceHref(href))) {
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

export function isInternalWorkspaceHref(href: string) {
  if (!href) {
    return false;
  }

  const normalizedHref = normalizeHref(href);
  return normalizedHref.startsWith("/workspace");
}

export function buildRouteState(href: string): WorkspacePaneRouteState {
  const normalizedHref = normalizeHref(href);
  const [pathname, search = ""] = normalizedHref.split("?");
  return {
    pathname: pathname || "/workspace",
    search: search ? `?${search}` : "",
  };
}
