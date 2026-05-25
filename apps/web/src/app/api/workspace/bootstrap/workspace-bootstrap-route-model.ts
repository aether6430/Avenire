export const WORKSPACE_BOOTSTRAP_LOAD_ERROR =
  "Unable to load workspace bootstrap.";

export function resolveWorkspaceBootstrapRouteError(
  error: unknown,
  fallback: string
) {
  return error instanceof Error ? error.message : fallback;
}
