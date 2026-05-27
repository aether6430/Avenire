import { resolveApiErrorMessage } from "@/lib/api-error-message";

export const WORKSPACE_BULK_OPERATION_ERROR = "Bulk operation failed";

export function resolveWorkspaceBulkRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
