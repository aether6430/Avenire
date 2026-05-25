export function normalizeWorkspaceLogoInput(value: unknown) {
  return typeof value === "string" ? value.trim() || null : null;
}

export const WORKSPACE_ROUTE_DELETE_ERROR = "Unable to delete workspace.";
export const WORKSPACE_ROUTE_PATCH_ERROR = "Unable to update workspace icon.";

export function resolveWorkspaceDeleteFailure(status: string) {
  if (status === "workspace-not-found") {
    return { error: "Workspace not found", status: 404 as const };
  }
  if (status === "forbidden") {
    return { error: "Forbidden", status: 403 as const };
  }
  return { error: "Only owners can delete workspaces", status: 403 as const };
}

export function resolveWorkspacePatchFailure(status: string) {
  if (status === "workspace-not-found") {
    return { error: "Workspace not found", status: 404 as const };
  }
  return { error: "Forbidden", status: 403 as const };
}

export function resolveWorkspaceRouteError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}
