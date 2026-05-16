import { describe, expect, it } from "vitest";
import {
  buildWorkspaceItemBulkSummary,
  countSuccessfulWorkspaceItemBulkResults,
  type WorkspaceItemBulkMutationResult,
  workspaceItemBulkRequestSchema,
} from "./workspace-item-bulk-model";

describe("workspace item bulk model", () => {
  it("validates both delete and move payload variants", () => {
    expect(
      workspaceItemBulkRequestSchema.safeParse({
        operation: "delete",
        items: [{ id: "11111111-1111-4111-8111-111111111111", kind: "file" }],
      }).success
    ).toBe(true);

    expect(
      workspaceItemBulkRequestSchema.safeParse({
        operation: "move",
        targetFolderId: "22222222-2222-4222-8222-222222222222",
        items: [{ id: "11111111-1111-4111-8111-111111111111", kind: "folder" }],
      }).success
    ).toBe(true);
  });

  it("counts successful results and builds the route summary", () => {
    const results: WorkspaceItemBulkMutationResult[] = [
      { id: "file-1", kind: "file", status: "ok" },
      {
        id: "folder-1",
        kind: "folder",
        status: "failed",
        error: "Read-only folder",
      },
    ];

    expect(countSuccessfulWorkspaceItemBulkResults(results)).toBe(1);
    expect(buildWorkspaceItemBulkSummary(results)).toEqual({
      total: 2,
      succeeded: 1,
      failed: 1,
    });
  });
});
