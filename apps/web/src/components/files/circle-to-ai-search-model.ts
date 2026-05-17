import type { UIMessage } from "ai";

export interface Point {
  x: number;
  y: number;
}

export interface SelectionRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface SnapshotPayload {
  base64: string;
  height: number;
  mimeType: string;
  width: number;
}

export type CircleToAiSearchFileKind = "pdf" | "image" | "video";

export const MIN_SNAPSHOT_EDGE = 48;

export const getMessageTextContent = (
  message: UIMessage | undefined
): string => {
  if (!message?.parts?.length) {
    return "";
  }

  return message.parts
    .filter(
      (part): part is { type: "text"; text: string } => part.type === "text"
    )
    .map((part) => part.text)
    .join("")
    .trim();
};

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function expandSelection(
  selection: SelectionRect,
  padding: number
): SelectionRect {
  return {
    x: selection.x - padding,
    y: selection.y - padding,
    width: selection.width + padding * 2,
    height: selection.height + padding * 2,
  };
}

export function pointInRect(point: Point, rect: DOMRect | SelectionRect) {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function clampPointToRect(point: Point, rect: SelectionRect): Point {
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height),
  };
}

export function getSelectionBounds(points: Point[]) {
  if (points.length === 0) {
    return null;
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  const width = maxX - minX;
  const height = maxY - minY;
  return { x: minX, y: minY, width, height };
}

export function getSelectionPadding(
  selection: Pick<SelectionRect, "height" | "width">
) {
  return Math.max(
    12,
    Math.round(Math.min(selection.width, selection.height) * 0.18)
  );
}

export function getExpandedSelectionFromPath(points: Point[]) {
  const bounds = getSelectionBounds(points);
  if (!bounds) {
    return null;
  }

  return expandSelection(bounds, getSelectionPadding(bounds));
}

export function buildPathData(points: Point[]) {
  if (points.length === 0) {
    return "";
  }

  return `${points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")} Z`;
}

export function intersectRect(
  a: SelectionRect,
  b: DOMRect | SelectionRect
): SelectionRect | null {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const width = Math.min(a.x + a.width, b.x + b.width) - x;
  const height = Math.min(a.y + a.height, b.y + b.height) - y;

  if (width <= 0 || height <= 0) {
    return null;
  }

  return { x, y, width, height };
}
