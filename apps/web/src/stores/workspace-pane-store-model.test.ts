import { describe, expect, it } from "vitest";
import type {
  WorkspacePaneRecord,
  WorkspacePaneRouteState,
} from "@/lib/workspace-pane-model";
import {
  closeWorkspacePaneState,
  ensureInitializedWorkspacePaneState,
  moveWorkspacePaneToSplitState,
  openWorkspacePaneState,
  reorderWorkspacePaneState,
  setPaneRouteInWorkspacePaneState,
  setPaneSizesInWorkspacePaneState,
  setRowSizesInWorkspacePaneState,
  syncActivePaneRouteInWorkspacePaneState,
  type WorkspacePaneRowRecord,
} from "@/stores/workspace-pane-store-model";

interface PersistedState {
  activePaneId: string | null;
  initialized: boolean;
  panes: WorkspacePaneRecord[];
  rows: WorkspacePaneRowRecord[];
}

function buildRouteState(
  pathname: string,
  search = ""
): WorkspacePaneRouteState {
  return { pathname, search };
}

function buildPane(
  overrides: Partial<WorkspacePaneRecord> & Pick<WorkspacePaneRecord, "id">
): WorkspacePaneRecord {
  return {
    id: overrides.id,
    route: buildRouteState(`/workspace/${overrides.id}`),
    rowId: "row-1",
    size: 100,
    ...overrides,
  };
}

function buildState(overrides: Partial<PersistedState> = {}): PersistedState {
  return {
    activePaneId: "pane-1",
    initialized: true,
    panes: [buildPane({ id: "pane-1" })],
    rows: [{ id: "row-1", size: 100 }],
    ...overrides,
  };
}

describe("workspace pane store model", () => {
  it("initializes a first pane only when the store is empty", () => {
    const initialized = ensureInitializedWorkspacePaneState(
      {
        activePaneId: null,
        initialized: false,
        panes: [],
        rows: [],
      },
      buildRouteState("/workspace/files"),
      { createPaneId: () => "pane-new", createRowId: () => "row-new" }
    );

    expect(initialized).toMatchObject({
      activePaneId: "pane-new",
      initialized: true,
      panes: [
        {
          id: "pane-new",
          route: { pathname: "/workspace/files", search: "" },
          rowId: "row-new",
          size: 100,
        },
      ],
      rows: [{ id: "row-new", size: 100 }],
    });

    const existing = buildState();
    expect(
      ensureInitializedWorkspacePaneState(
        existing,
        buildRouteState("/workspace/chats"),
        { createPaneId: () => "pane-other", createRowId: () => "row-other" }
      )
    ).toBe(existing);
  });

  it("opens panes around the source pane and parses href routes", () => {
    const state = buildState({
      panes: [
        buildPane({ id: "pane-1", route: buildRouteState("/workspace/files") }),
        buildPane({ id: "pane-2", route: buildRouteState("/workspace/chats") }),
      ],
    });

    const after = openWorkspacePaneState(
      state,
      "/workspace/notes?id=1",
      { sourcePaneId: "pane-1" },
      { createPaneId: () => "pane-3", createRowId: () => "row-new" }
    );
    expect(after.activePaneId).toBe("pane-3");
    expect(after.panes.map((pane) => pane.id)).toEqual([
      "pane-1",
      "pane-3",
      "pane-2",
    ]);
    expect(after.panes[1]).toMatchObject({
      route: { pathname: "/workspace/notes", search: "?id=1" },
      rowId: "row-1",
    });

    const before = openWorkspacePaneState(
      state,
      "/workspace/tasks",
      { sourcePaneId: "pane-2", splitPlacement: "before" },
      { createPaneId: () => "pane-4", createRowId: () => "row-new" }
    );
    expect(before.panes.map((pane) => pane.id)).toEqual([
      "pane-1",
      "pane-4",
      "pane-2",
    ]);

    const vertical = openWorkspacePaneState(
      buildState({
        panes: [
          buildPane({
            id: "pane-1",
            route: buildRouteState("/workspace/files"),
          }),
          buildPane({
            id: "pane-2",
            route: buildRouteState("/workspace/chats"),
          }),
        ],
      }),
      "/workspace/flashcards",
      {
        sourcePaneId: "pane-2",
        splitDirection: "vertical",
      },
      { createPaneId: () => "pane-5", createRowId: () => "row-2" }
    );

    expect(vertical.activePaneId).toBe("pane-5");
    expect(vertical.rows.map((row) => [row.id, Math.round(row.size)])).toEqual([
      ["row-1", 50],
      ["row-2", 50],
    ]);
    expect(vertical.panes.find((pane) => pane.id === "pane-5")).toMatchObject({
      route: { pathname: "/workspace/flashcards", search: "" },
      rowId: "row-2",
    });
  });

  it("closes active panes conservatively and reorders within the target row", () => {
    const state = buildState({
      activePaneId: "pane-2",
      panes: [
        buildPane({ id: "pane-1" }),
        buildPane({ id: "pane-2" }),
        buildPane({ id: "pane-3" }),
      ],
    });

    const closed = closeWorkspacePaneState(state, "pane-2");
    expect(closed.activePaneId).toBe("pane-3");
    expect(closed.panes.map((pane) => pane.id)).toEqual(["pane-1", "pane-3"]);

    const reordered = reorderWorkspacePaneState(
      buildState({
        panes: [
          buildPane({ id: "pane-1" }),
          buildPane({ id: "pane-2" }),
          buildPane({ id: "pane-3" }),
        ],
      }),
      "pane-1",
      "pane-3"
    );

    expect(reordered.panes.map((pane) => pane.id)).toEqual([
      "pane-2",
      "pane-1",
      "pane-3",
    ]);

    const movedVertical = moveWorkspacePaneToSplitState(
      buildState({
        panes: [
          buildPane({ id: "pane-1", rowId: "row-1" }),
          buildPane({ id: "pane-2", rowId: "row-1" }),
          buildPane({ id: "pane-3", rowId: "row-2" }),
        ],
        rows: [
          { id: "row-1", size: 70 },
          { id: "row-2", size: 30 },
        ],
      }),
      "pane-1",
      "pane-3",
      {
        splitDirection: "vertical",
        splitPlacement: "after",
      },
      { createRowId: () => "row-3" }
    );

    expect(
      movedVertical.rows.map((row) => [row.id, Math.round(row.size)])
    ).toEqual([
      ["row-1", 70],
      ["row-2", 15],
      ["row-3", 15],
    ]);
    expect(
      movedVertical.panes.find((pane) => pane.id === "pane-1")
    ).toMatchObject({
      rowId: "row-3",
    });
  });

  it("normalizes pane and row sizes after updates", () => {
    const state = buildState({
      panes: [
        buildPane({ id: "pane-1", size: 20 }),
        buildPane({ id: "pane-2", size: 80 }),
      ],
    });

    const nextPaneSizes = setPaneSizesInWorkspacePaneState(
      state,
      "row-1",
      [20, 20]
    );
    expect(nextPaneSizes.panes.map((pane) => Math.round(pane.size))).toEqual([
      50, 50,
    ]);

    const nextRowSizes = setRowSizesInWorkspacePaneState(
      buildState({
        rows: [
          { id: "row-1", size: 10 },
          { id: "row-2", size: 30 },
        ],
      }),
      [10, 30]
    );
    expect(nextRowSizes.rows.map((row) => Math.round(row.size))).toEqual([
      25, 75,
    ]);
  });

  it("updates and syncs the active pane route without disturbing other panes", () => {
    const state = buildState({
      activePaneId: "pane-2",
      panes: [
        buildPane({ id: "pane-1", route: buildRouteState("/workspace/files") }),
        buildPane({ id: "pane-2", route: buildRouteState("/workspace/chats") }),
      ],
    });

    const explicitlyRouted = setPaneRouteInWorkspacePaneState(
      state,
      "pane-1",
      buildRouteState("/workspace/tasks", "?view=board")
    );
    expect(explicitlyRouted.activePaneId).toBe("pane-1");
    expect(explicitlyRouted.panes[0]?.route).toEqual({
      pathname: "/workspace/tasks",
      search: "?view=board",
    });

    const synced = syncActivePaneRouteInWorkspacePaneState(
      state,
      buildRouteState("/workspace/tasks")
    );
    expect(synced.panes[1]?.route).toEqual({
      pathname: "/workspace/tasks",
      search: "",
    });
    expect(synced.panes[0]?.route).toEqual({
      pathname: "/workspace/files",
      search: "",
    });
  });
});
