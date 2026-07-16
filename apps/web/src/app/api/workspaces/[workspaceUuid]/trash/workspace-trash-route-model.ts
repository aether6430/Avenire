import { Schema } from "effect-v4";
import { resolveApiErrorMessage } from "@/lib/api-error-message";

const workspaceTrashMutationItemSchema = Schema.Struct({
  id: Schema.String.check(Schema.isMinLength(1)),
  kind: Schema.Literals(["file", "folder"]),
});

export class WorkspaceTrashMutationRequest extends Schema.Class<WorkspaceTrashMutationRequest>(
  "WorkspaceTrashMutationRequest"
)({
  items: Schema.optional(
    Schema.Array(workspaceTrashMutationItemSchema).check(Schema.isMinLength(1))
  ),
  operation: Schema.optional(Schema.Literals(["restore", "delete"])),
}) {}

export type WorkspaceTrashMutationItem =
  typeof workspaceTrashMutationItemSchema.Type;

export const WORKSPACE_TRASH_LOAD_ERROR = "Unable to load trash.";
export const WORKSPACE_TRASH_MUTATION_ERROR = "Unable to update trash.";

export type WorkspaceTrashMutationBody = WorkspaceTrashMutationRequest;

export function isValidWorkspaceTrashRestorePayload(
  body: WorkspaceTrashMutationBody
): body is WorkspaceTrashMutationBody & {
  items: WorkspaceTrashMutationItem[];
  operation: "restore";
} {
  return (
    body.operation === "restore" &&
    Array.isArray(body.items) &&
    body.items.length > 0
  );
}

export function isValidWorkspaceTrashDeletePayload(
  body: WorkspaceTrashMutationBody
): body is WorkspaceTrashMutationBody & {
  items: WorkspaceTrashMutationItem[];
  operation: "delete";
} {
  return (
    body.operation === "delete" &&
    Array.isArray(body.items) &&
    body.items.length > 0
  );
}

export function buildWorkspaceTrashMutationResultsSummary(
  results: Array<{ id: string; kind: "file" | "folder"; ok: boolean }>
) {
  return {
    failed: results.filter((entry) => !entry.ok).length,
    succeeded: results.filter((entry) => entry.ok).length,
    total: results.length,
  };
}

export function filterWorkspaceTrashStorageKeys(storageKeys: string[]) {
  return storageKeys.filter(
    (storageKey) => storageKey && !storageKey.startsWith("virtual:duplicate:")
  );
}

export function resolveWorkspaceTrashRouteError(
  error: unknown,
  fallback: string
) {
  return resolveApiErrorMessage(error, fallback);
}
