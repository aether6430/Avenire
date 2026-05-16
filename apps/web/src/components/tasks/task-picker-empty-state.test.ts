import { describe, expect, it } from "vitest";
import {
  getTaskAssigneeEmptyStateMessage,
  getTaskResourceEmptyStateMessage,
} from "@/components/tasks/task-picker-empty-state";

describe("task picker empty state copy", () => {
  it("reports assignee loading, error, and empty states explicitly", () => {
    expect(
      getTaskAssigneeEmptyStateMessage({
        loading: true,
        loadFailed: false,
      })
    ).toBe("Loading workspace members...");

    expect(
      getTaskAssigneeEmptyStateMessage({
        loading: false,
        loadFailed: true,
      })
    ).toBe("Unable to load workspace members.");

    expect(
      getTaskAssigneeEmptyStateMessage({
        loading: false,
        loadFailed: false,
      })
    ).toBe("No workspace member matches that search.");
  });

  it("reports resource loading, error, and empty states explicitly", () => {
    expect(
      getTaskResourceEmptyStateMessage({
        loading: true,
        loadFailed: false,
      })
    ).toBe("Loading resources...");

    expect(
      getTaskResourceEmptyStateMessage({
        loading: false,
        loadFailed: true,
      })
    ).toBe("Unable to load task resources.");

    expect(
      getTaskResourceEmptyStateMessage({
        loading: false,
        loadFailed: false,
      })
    ).toBe("No resources match that search.");
  });
});
