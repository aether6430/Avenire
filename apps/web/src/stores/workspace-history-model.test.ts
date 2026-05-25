import { describe, expect, it } from "vitest";
import {
  EMPTY_WORKSPACE_HISTORY_STATE,
  getPaneHistoryState,
  recordPaneWorkspaceRoute,
} from "@/stores/workspace-history-model";

describe("workspace history model", () => {
  it("returns an empty history state for unknown panes", () => {
    expect(getPaneHistoryState({ byPane: {} }, "pane-1")).toEqual(
      EMPTY_WORKSPACE_HISTORY_STATE
    );
  });

  it("records routes, rewinds/advances on back-forward hits, and trims future history", () => {
    const start = { byPane: {} };
    const once = recordPaneWorkspaceRoute(start, "pane-1", "/workspace");
    const twice = recordPaneWorkspaceRoute(once, "pane-1", "/workspace/tasks");
    const thrice = recordPaneWorkspaceRoute(
      twice,
      "pane-1",
      "/workspace/files"
    );

    expect(thrice.byPane["pane-1"]).toEqual({
      entries: ["/workspace", "/workspace/tasks", "/workspace/files"],
      index: 2,
    });

    const back = recordPaneWorkspaceRoute(thrice, "pane-1", "/workspace/tasks");
    expect(back.byPane["pane-1"]).toEqual({
      entries: ["/workspace", "/workspace/tasks", "/workspace/files"],
      index: 1,
    });

    const forward = recordPaneWorkspaceRoute(
      back,
      "pane-1",
      "/workspace/files"
    );
    expect(forward.byPane["pane-1"]).toEqual({
      entries: ["/workspace", "/workspace/tasks", "/workspace/files"],
      index: 2,
    });

    const branch = recordPaneWorkspaceRoute(back, "pane-1", "/workspace/notes");
    expect(branch.byPane["pane-1"]).toEqual({
      entries: ["/workspace", "/workspace/tasks", "/workspace/notes"],
      index: 2,
    });
  });

  it("ignores empty routes and exact duplicates", () => {
    const state = {
      byPane: {
        "pane-1": {
          entries: ["/workspace"],
          index: 0,
        },
      },
    };

    expect(recordPaneWorkspaceRoute(state, "pane-1", "")).toBe(state);
    expect(recordPaneWorkspaceRoute(state, "pane-1", "/workspace")).toBe(state);
  });
});
