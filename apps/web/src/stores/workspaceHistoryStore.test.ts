import { beforeEach, describe, expect, it } from "vitest";
import { useWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";

describe("workspace history store", () => {
  beforeEach(() => {
    useWorkspaceHistoryStore.setState({ byPane: {} });
  });

  it("records pane history through the store action", () => {
    useWorkspaceHistoryStore.getState().recordRoute("pane-1", "/workspace");
    useWorkspaceHistoryStore
      .getState()
      .recordRoute("pane-1", "/workspace/tasks");

    expect(useWorkspaceHistoryStore.getState().byPane["pane-1"]).toEqual({
      entries: ["/workspace", "/workspace/tasks"],
      index: 1,
    });
  });
});
