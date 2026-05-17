import type { PointerEvent as ReactPointerEvent } from "react";
import {
  type CircleToAiSearchFileKind,
  clamp,
  intersectRect,
  type Point,
  pointInRect,
  type SelectionRect,
  type SnapshotPayload,
} from "@/components/files/circle-to-ai-search-model";

export type CircleToAiSnapshotTarget =
  | HTMLCanvasElement
  | HTMLImageElement
  | HTMLVideoElement;

export function getTargetRectWithinContainer(
  container: HTMLElement,
  target: CircleToAiSnapshotTarget
) {
  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  return {
    x: targetRect.left - containerRect.left,
    y: targetRect.top - containerRect.top,
    width: targetRect.width,
    height: targetRect.height,
  };
}

export function getLocalPoint(
  event: ReactPointerEvent<HTMLElement>,
  rect: DOMRect
) {
  return {
    x: clamp(event.clientX - rect.left, 0, rect.width),
    y: clamp(event.clientY - rect.top, 0, rect.height),
  };
}

export function pickMediaTarget(container: HTMLElement, center: Point) {
  const candidates = Array.from(
    container.querySelectorAll<CircleToAiSnapshotTarget>("canvas, img, video")
  ).map((element) => ({
    element,
    rect: element.getBoundingClientRect(),
  }));

  const containing = candidates.filter(({ rect }) => pointInRect(center, rect));
  if (containing.length > 0) {
    return containing[0]?.element ?? null;
  }

  const intersecting = candidates
    .map((candidate) => ({
      ...candidate,
      overlap: intersectRect(
        {
          x: center.x - 1,
          y: center.y - 1,
          width: 2,
          height: 2,
        },
        candidate.rect
      ),
    }))
    .filter((candidate) => candidate.overlap)
    .sort(
      (left, right) =>
        (right.overlap?.width ?? 0) * (right.overlap?.height ?? 0) -
        (left.overlap?.width ?? 0) * (left.overlap?.height ?? 0)
    );

  return intersecting[0]?.element ?? candidates[0]?.element ?? null;
}

export function renderSnapshotFromSelection(input: {
  container: HTMLElement;
  fileKind: CircleToAiSearchFileKind;
  targetElement: CircleToAiSnapshotTarget;
  path: Point[];
  selection: SelectionRect;
}) {
  const { container, fileKind, path, selection, targetElement } = input;
  const target = targetElement;

  if (fileKind === "video" && target instanceof HTMLVideoElement) {
    target.pause();
  }

  const targetRect = getTargetRectWithinContainer(container, target);
  const intersected = intersectRect(selection, targetRect);
  if (!intersected) {
    return null;
  }

  let pixelWidth = target.width;
  let pixelHeight = target.height;
  if (target instanceof HTMLImageElement) {
    pixelWidth = target.naturalWidth;
    pixelHeight = target.naturalHeight;
  } else if (target instanceof HTMLVideoElement) {
    pixelWidth = target.videoWidth;
    pixelHeight = target.videoHeight;
  }

  if (
    !(
      pixelWidth > 0 &&
      pixelHeight > 0 &&
      targetRect.width > 0 &&
      targetRect.height > 0
    )
  ) {
    return null;
  }

  const scaleX = pixelWidth / targetRect.width;
  const scaleY = pixelHeight / targetRect.height;
  const sourceX = Math.max(0, (intersected.x - targetRect.x) * scaleX);
  const sourceY = Math.max(0, (intersected.y - targetRect.y) * scaleY);
  const sourceWidth = Math.min(
    pixelWidth - sourceX,
    intersected.width * scaleX
  );
  const sourceHeight = Math.min(
    pixelHeight - sourceY,
    intersected.height * scaleY
  );

  if (!(sourceWidth > 1 && sourceHeight > 1)) {
    return null;
  }

  const maxEdge = 1024;
  const resizeRatio = Math.min(
    1,
    maxEdge / Math.max(sourceWidth, sourceHeight)
  );
  const outputWidth = Math.max(1, Math.round(sourceWidth * resizeRatio));
  const outputHeight = Math.max(1, Math.round(sourceHeight * resizeRatio));

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  context.imageSmoothingQuality = "high";
  context.save();
  context.beginPath();
  for (let index = 0; index < path.length; index += 1) {
    const point = path[index];
    if (!point) {
      continue;
    }

    const localX = (point.x - targetRect.x) * scaleX - sourceX;
    const localY = (point.y - targetRect.y) * scaleY - sourceY;

    if (index === 0) {
      context.moveTo(localX * resizeRatio, localY * resizeRatio);
    } else {
      context.lineTo(localX * resizeRatio, localY * resizeRatio);
    }
  }
  context.closePath();
  context.clip();
  context.drawImage(
    target,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight
  );
  context.restore();

  try {
    return {
      base64: canvas.toDataURL("image/png").split(",")[1] ?? "",
      mimeType: "image/png",
      width: outputWidth,
      height: outputHeight,
    } satisfies SnapshotPayload;
  } catch {
    return null;
  }
}
