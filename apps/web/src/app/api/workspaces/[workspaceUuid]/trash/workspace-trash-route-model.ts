export interface WorkspaceTrashMutationItem {
  id: string;
  kind: "file" | "folder";
}

export interface WorkspaceTrashMutationBody {
  items?: WorkspaceTrashMutationItem[];
  operation?: "restore" | "delete";
}

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
