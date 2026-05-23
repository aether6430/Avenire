import type { DragEvent } from "react";
import { buildRouteState } from "@/lib/workspace-panes";

export const COMPACT_PANE_WIDTH = 900;
export type PaneDropRegion = "bottom" | "center" | "left" | "right" | "top";

export interface PaneDropPreview {
  href: string | null;
  paneId: string;
  region: PaneDropRegion;
}

export const PREVIEW_PANE_ID = "__workspace-pane-drop-preview__";
export const PREVIEW_ROW_ID = "__preview-row__";
export const PREVIEW_PANE_MIN_SIZE = 28;
export const WORKSPACE_PANE_REORDER_MIME =
  "application/x-avenire-workspace-pane-id";
const PANEL_LAYOUT_SIZE_EPSILON = 0.25;

export interface RenderablePane {
  id: string;
  isDropPreview?: boolean;
  previewTargetPaneId?: string;
  route: {
    pathname: string;
    search: string;
  };
  rowId: string;
  size: number;
}

export interface RenderablePaneRow {
  id: string;
  panes: RenderablePane[];
  size: number;
}

export function createTransparentDragImage() {
  if (typeof document === "undefined") {
    return null;
  }

  const pixel = document.createElement("canvas");
  pixel.width = 1;
  pixel.height = 1;
  return pixel;
}

export function isInteractiveHeaderTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    Boolean(
      target.closest("button, a, input, select, textarea, [role='menuitem']")
    )
  );
}

export function getPaneDropRegion(
  event: DragEvent<HTMLElement>,
  bounds: DOMRect
): PaneDropRegion {
  const x = (event.clientX - bounds.left) / Math.max(bounds.width, 1);
  const y = (event.clientY - bounds.top) / Math.max(bounds.height, 1);
  if (y <= 0.22) {
    return "top";
  }
  if (y >= 0.78) {
    return "bottom";
  }
  if (x <= 0.22) {
    return "left";
  }
  if (x >= 0.78) {
    return "right";
  }

  return "center";
}

export function getPaneSplitDirection(region: PaneDropRegion) {
  return region === "top" || region === "bottom"
    ? ("vertical" as const)
    : ("horizontal" as const);
}

export function getPaneSplitPlacement(region: PaneDropRegion) {
  return region === "left" || region === "top" ? "before" : "after";
}

export function getDropIndicatorStyle(region: PaneDropRegion) {
  switch (region) {
    case "left":
      return {
        height: "calc(100% - 0.75rem)",
        inset: "0.375rem auto 0.375rem 0.375rem",
        width: "0.1875rem",
      };
    case "right":
      return {
        height: "calc(100% - 0.75rem)",
        inset: "0.375rem 0.375rem 0.375rem auto",
        width: "0.1875rem",
      };
    case "top":
      return {
        height: "0.1875rem",
        inset: "0.375rem 0.375rem auto 0.375rem",
        width: "calc(100% - 0.75rem)",
      };
    case "bottom":
      return {
        height: "0.1875rem",
        inset: "auto 0.375rem 0.375rem 0.375rem",
        width: "calc(100% - 0.75rem)",
      };
    default:
      return {
        height: "calc(100% - 0.75rem)",
        inset: "0.375rem",
        width: "calc(100% - 0.75rem)",
      };
  }
}

export function getDraggedPaneId(
  dataTransfer: DataTransfer | null | undefined,
  fallbackPaneId: string | null
) {
  const dataTransferPaneId =
    dataTransfer?.getData(WORKSPACE_PANE_REORDER_MIME) || null;
  return dataTransferPaneId || fallbackPaneId;
}

export function isDragLeaveInsideElement(
  event: DragEvent<HTMLElement>,
  element: HTMLElement = event.currentTarget
) {
  const relatedTarget = event.relatedTarget;
  if (relatedTarget instanceof Node && element.contains(relatedTarget)) {
    return true;
  }

  const bounds = element.getBoundingClientRect();
  return (
    event.clientX >= bounds.left &&
    event.clientX <= bounds.right &&
    event.clientY >= bounds.top &&
    event.clientY <= bounds.bottom
  );
}

export function isSameDropPreview(
  current: PaneDropPreview | null,
  next: PaneDropPreview | null
) {
  return (
    current?.href === next?.href &&
    current?.paneId === next?.paneId &&
    current?.region === next?.region
  );
}

export function normalizePreviewPaneSizes<
  T extends { id: string; size: number },
>(panes: T[]) {
  if (panes.length === 0) {
    return panes;
  }

  const size = 100 / panes.length;
  return panes.map((pane) => ({
    ...pane,
    size,
  }));
}

export function shouldPersistWorkspacePanelLayout(input: {
  currentSizes: number[];
  draggedPaneId: string | null;
  hasPreviewPane: boolean;
  nextSizes: number[];
}) {
  if (input.draggedPaneId || input.hasPreviewPane) {
    return false;
  }

  if (
    input.currentSizes.length === 0 ||
    input.currentSizes.length !== input.nextSizes.length
  ) {
    return false;
  }

  return input.currentSizes.some(
    (size, index) =>
      Math.abs(size - (input.nextSizes[index] ?? size)) >
      PANEL_LAYOUT_SIZE_EPSILON
  );
}

function normalizeRenderableRowSizes(rows: RenderablePaneRow[]) {
  if (rows.length === 0) {
    return rows;
  }

  const total = rows.reduce((sum, row) => sum + row.size, 0) || rows.length;
  return rows.map((row) => ({
    ...row,
    size: (row.size / total) * 100,
  }));
}

export function buildPreviewPanes(
  panes: RenderablePane[],
  preview: PaneDropPreview | null,
  draggedPaneId: string | null
) {
  if (
    !preview ||
    preview.region === "center" ||
    preview.region === "top" ||
    preview.region === "bottom"
  ) {
    return panes;
  }

  const targetPane = panes.find((pane) => pane.id === preview.paneId);
  if (!targetPane) {
    return panes;
  }

  const sourcePane = draggedPaneId
    ? {
        id: PREVIEW_PANE_ID,
        isDropPreview: true,
        previewTargetPaneId: targetPane.id,
        route: { pathname: "/workspace", search: "" },
        rowId: targetPane.rowId,
        size: PREVIEW_PANE_MIN_SIZE,
      }
    : {
        id: PREVIEW_PANE_ID,
        isDropPreview: true,
        previewTargetPaneId: targetPane.id,
        route: preview.href
          ? buildRouteState(preview.href)
          : { pathname: "/workspace", search: "" },
        rowId: targetPane.rowId,
        size: PREVIEW_PANE_MIN_SIZE,
      };

  const withoutDragged = draggedPaneId
    ? panes.filter((pane) => pane.id !== draggedPaneId)
    : panes;
  const targetIndex = withoutDragged.findIndex(
    (pane) => pane.id === preview.paneId
  );
  const insertIndex =
    targetIndex < 0
      ? withoutDragged.length
      : targetIndex + (preview.region === "right" ? 1 : 0);

  const nextPanes: RenderablePane[] = [...withoutDragged];
  nextPanes.splice(insertIndex, 0, {
    ...sourcePane,
    id: PREVIEW_PANE_ID,
    isDropPreview: true,
    previewTargetPaneId: targetPane.id,
    rowId: targetPane.rowId,
  });

  return normalizePreviewPaneSizes(nextPanes);
}

function splitPreviewRows(
  rows: Array<{ id: string; size: number }>,
  targetRowId: string,
  preview: PaneDropPreview,
  previewPane: RenderablePane
) {
  const targetRow = rows.find((row) => row.id === targetRowId);
  if (!targetRow) {
    return rows;
  }

  const previewRow = {
    id: PREVIEW_ROW_ID,
    size: targetRow.size / 2,
  };
  const resizedTargetRow = {
    ...targetRow,
    size: targetRow.size / 2,
  };

  const nextRows: Array<{
    id: string;
    previewPane?: RenderablePane;
    size: number;
  }> = [];
  for (const row of rows) {
    if (row.id !== targetRowId) {
      nextRows.push(row);
      continue;
    }

    if (preview.region === "top") {
      nextRows.push(previewRow, resizedTargetRow);
    } else {
      nextRows.push(resizedTargetRow, previewRow);
    }
  }

  return nextRows.map((row) =>
    row.id === PREVIEW_ROW_ID ? { ...row, previewPane } : row
  );
}

export function buildRenderablePaneRows(
  rows: Array<{ id: string; size: number }>,
  panes: RenderablePane[],
  preview: PaneDropPreview | null,
  draggedPaneId: string | null
) {
  const previewTargetPane = preview
    ? panes.find((pane) => pane.id === preview.paneId)
    : null;
  const previewTargetRowId =
    preview && preview.region !== "center"
      ? (previewTargetPane?.rowId ?? null)
      : null;
  const previewPane: RenderablePane | null =
    preview && (preview.region === "top" || preview.region === "bottom")
      ? {
          id: PREVIEW_PANE_ID,
          isDropPreview: true,
          previewTargetPaneId: preview.paneId,
          route: preview.href
            ? buildRouteState(preview.href)
            : { pathname: "/workspace", search: "" },
          rowId: PREVIEW_ROW_ID,
          size: 100,
        }
      : null;
  const previewRows: Array<{
    id: string;
    previewPane?: RenderablePane;
    size: number;
  }> =
    previewTargetRowId && preview && previewPane
      ? splitPreviewRows(rows, previewTargetRowId, preview, previewPane)
      : rows;

  const rowsWithPanes = previewRows
    .map((row) => {
      if (row.previewPane) {
        return {
          id: row.id,
          panes: [row.previewPane],
          size: row.size,
        } satisfies RenderablePaneRow;
      }

      const rowPanes = panes.filter((pane) => pane.rowId === row.id);
      if (rowPanes.length === 0) {
        return null;
      }

      if (
        previewTargetRowId === row.id &&
        preview &&
        preview.region !== "top" &&
        preview.region !== "bottom"
      ) {
        return {
          id: row.id,
          panes: buildPreviewPanes(rowPanes, preview, draggedPaneId),
          size: row.size,
        } satisfies RenderablePaneRow;
      }

      if (
        draggedPaneId &&
        previewTargetRowId &&
        rowPanes.some((pane) => pane.id === draggedPaneId)
      ) {
        const remainingPanes = rowPanes.filter(
          (pane) => pane.id !== draggedPaneId
        );
        if (remainingPanes.length === 0) {
          return null;
        }

        return {
          id: row.id,
          panes: normalizePreviewPaneSizes(remainingPanes),
          size: row.size,
        } satisfies RenderablePaneRow;
      }

      return {
        id: row.id,
        panes: rowPanes,
        size: row.size,
      } satisfies RenderablePaneRow;
    })
    .filter((row): row is RenderablePaneRow => Boolean(row));

  return normalizeRenderableRowSizes(rowsWithPanes);
}
