import { z } from "zod";

export const workspaceItemBulkSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum(["file", "folder"]),
});

export const workspaceItemBulkRequestSchema = z.discriminatedUnion(
  "operation",
  [
    z.object({
      operation: z.literal("delete"),
      items: z.array(workspaceItemBulkSchema).min(1).max(500),
    }),
    z.object({
      operation: z.literal("move"),
      targetFolderId: z.string().uuid(),
      items: z.array(workspaceItemBulkSchema).min(1).max(500),
    }),
  ]
);

export interface WorkspaceItemBulkMutationResult {
  error?: string;
  id: string;
  kind: "file" | "folder";
  status: "ok" | "failed";
}

export function countSuccessfulWorkspaceItemBulkResults(
  results: WorkspaceItemBulkMutationResult[]
) {
  return results.filter((entry) => entry.status === "ok").length;
}

export function buildWorkspaceItemBulkSummary(
  results: WorkspaceItemBulkMutationResult[]
) {
  const succeeded = countSuccessfulWorkspaceItemBulkResults(results);
  return {
    total: results.length,
    succeeded,
    failed: results.length - succeeded,
  };
}
