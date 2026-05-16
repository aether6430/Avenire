interface ExplorerWorkspaceSummary {
  name: string;
  workspaceId: string;
}

interface ResolveExplorerRouteContextOptions {
  folderUuidFromPage?: string;
  pathname: string;
  workspaceUuidFromPage?: string;
}

interface ResolveExplorerWorkspaceNameOptions {
  bootstrapWorkspaces: ExplorerWorkspaceSummary[];
  cachedWorkspaces: ExplorerWorkspaceSummary[];
  workspaceUuid: string;
}

export function resolveExplorerRouteContext({
  folderUuidFromPage,
  pathname,
  workspaceUuidFromPage,
}: ResolveExplorerRouteContextOptions) {
  const routeMatch = pathname.match(
    /^\/workspace\/files\/([^/]+)\/folder\/([^/?#]+)/
  );
  const workspaceUuidParam = routeMatch?.[1] ?? "";
  const folderUuidParam = routeMatch?.[2] ?? "";

  return {
    currentFolderId: folderUuidFromPage ?? folderUuidParam,
    workspaceUuid: workspaceUuidFromPage ?? workspaceUuidParam,
  };
}

export function resolveExplorerWorkspaceName({
  bootstrapWorkspaces,
  cachedWorkspaces,
  workspaceUuid,
}: ResolveExplorerWorkspaceNameOptions) {
  if (!workspaceUuid) {
    return null;
  }

  const cachedWorkspaceName =
    cachedWorkspaces.find(
      (workspace) => workspace.workspaceId === workspaceUuid
    )?.name ?? null;
  const bootstrapWorkspaceName =
    bootstrapWorkspaces.find(
      (workspace) => workspace.workspaceId === workspaceUuid
    )?.name ?? null;

  return cachedWorkspaceName ?? bootstrapWorkspaceName ?? null;
}
