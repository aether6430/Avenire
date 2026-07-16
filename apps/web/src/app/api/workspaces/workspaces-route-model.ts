import { resolveApiErrorMessage } from "@/lib/api-error-message";
import { Schema } from "effect-v4";

export const workspaceCreateSchema = Schema.Struct({
  name: Schema.optional(Schema.String),
});

export const WORKSPACE_ROUTE_LOAD_ERROR = "Unable to load workspace.";
export const WORKSPACE_ROUTE_CREATE_ERROR = "Unable to create workspace.";

export function resolveWorkspaceRouteError(error: unknown, fallback: string) {
  return resolveApiErrorMessage(error, fallback);
}
