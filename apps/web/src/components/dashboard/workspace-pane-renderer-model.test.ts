import { describe, expect, it } from "vitest";
import {
  buildPreviewPanes,
  buildRenderablePaneRows,
  getPaneDropRegion,
  normalizePreviewPaneSizes,
  type RenderablePane,
} from "@/components/dashboard/workspace-pane-renderer-model";

describe("workspace pane renderer model", () => {
  it("detects left, center, and right pane drop regions", () => {
    const bounds = {
      left: 0,
      top: 0,
      height: 100,
      width: 100,
    } as DOMRect;

    expect(getPaneDropRegion({ clientX: 10 } as never, bounds)).toBe("left");
    expect(getPaneDropRegion({ clientX: 50 } as never, bounds)).toBe("center");
    expect(getPaneDropRegion({ clientX: 90 } as never, bounds)).toBe("right");
    expect(
      getPaneDropRegion({ clientX: 50, clientY: 10 } as never, bounds)
    ).toBe("top");
    expect(
      getPaneDropRegion({ clientX: 50, clientY: 90 } as never, bounds)
    ).toBe("bottom");
  });

  it("normalizes preview pane sizes when inserting a drop preview", () => {
    const panes: RenderablePane[] = [
      {
        id: "pane-a",
        route: { pathname: "/workspace", search: "" },
        rowId: "row-1",
        size: 60,
      },
      {
        id: "pane-b",
        route: { pathname: "/workspace/tasks", search: "" },
        rowId: "row-1",
        size: 40,
      },
    ];

    const next = buildPreviewPanes(
      panes,
      {
        href: "/workspace/flashcards",
        paneId: "pane-b",
        region: "left",
      },
      null
    );

    expect(next.map((pane) => pane.id)).toEqual([
      "pane-a",
      "__workspace-pane-drop-preview__",
      "pane-b",
    ]);
    expect(next.every((pane) => pane.size > 0)).toBe(true);
    expect(
      normalizePreviewPaneSizes(next).reduce((sum, pane) => sum + pane.size, 0)
    ).toBeCloseTo(100, 6);
    expect(next[1]?.route.pathname).toBe("/workspace/flashcards");
  });

  it("uses a dragged pane placeholder route when previewing a pane move", () => {
    const panes: RenderablePane[] = [
      {
        id: "pane-a",
        route: { pathname: "/workspace", search: "" },
        rowId: "row-1",
        size: 50,
      },
      {
        id: "pane-b",
        route: { pathname: "/workspace/tasks", search: "" },
        rowId: "row-1",
        size: 50,
      },
    ];

    const next = buildPreviewPanes(
      panes,
      {
        href: null,
        paneId: "pane-b",
        region: "right",
      },
      "pane-a"
    );

    expect(next.map((pane) => pane.id)).toEqual([
      "pane-b",
      "__workspace-pane-drop-preview__",
    ]);
    expect(next[1]?.route.pathname).toBe("/workspace");
  });

  it("builds renderable rows from pane rows and keeps row sizing stable", () => {
    const rows = buildRenderablePaneRows(
      [
        { id: "row-1", size: 30 },
        { id: "row-2", size: 70 },
      ],
      [
        {
          id: "pane-a",
          route: { pathname: "/workspace", search: "" },
          rowId: "row-1",
          size: 60,
        },
        {
          id: "pane-b",
          route: { pathname: "/workspace/tasks", search: "" },
          rowId: "row-1",
          size: 40,
        },
        {
          id: "pane-c",
          route: { pathname: "/workspace/flashcards", search: "" },
          rowId: "row-2",
          size: 100,
        },
      ],
      null,
      null
    );

    expect(rows.map((row) => [row.id, Math.round(row.size)])).toEqual([
      ["row-1", 30],
      ["row-2", 70],
    ]);
    expect(rows[0]?.panes.map((pane) => pane.id)).toEqual(["pane-a", "pane-b"]);
    expect(rows[1]?.panes.map((pane) => pane.id)).toEqual(["pane-c"]);
  });

  it("inserts a dedicated preview row for top and bottom split previews", () => {
    const rows = buildRenderablePaneRows(
      [{ id: "row-1", size: 100 }],
      [
        {
          id: "pane-a",
          route: { pathname: "/workspace", search: "" },
          rowId: "row-1",
          size: 100,
        },
      ],
      {
        href: "/workspace/tasks",
        paneId: "pane-a",
        region: "bottom",
      },
      null
    );

    expect(rows.map((row) => row.id)).toEqual(["row-1", "__preview-row__"]);
    expect(rows[1]?.panes.map((pane) => pane.id)).toEqual([
      "__workspace-pane-drop-preview__",
    ]);
    expect(rows[1]?.panes[0]?.route.pathname).toBe("/workspace/tasks");
  });
});
