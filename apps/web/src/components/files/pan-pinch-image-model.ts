export interface PanPinchPoint {
  x: number;
  y: number;
}

export interface PanPinchTransformState {
  scale: number;
  x: number;
  y: number;
}

interface PanPinchBounds {
  height: number;
  width: number;
}

interface PanPinchScaleLimits {
  maxScale: number;
  minScale: number;
}

interface BuildPanPinchZoomTransformInput extends PanPinchScaleLimits {
  bounds: PanPinchBounds;
  currentTransform: PanPinchTransformState;
  focalPoint: PanPinchPoint;
  requestedScale: number;
}

function clampPanPinchScale(
  value: number,
  { maxScale, minScale }: PanPinchScaleLimits
) {
  return Math.min(maxScale, Math.max(minScale, value));
}

export function clampPanPinchTransform(
  nextTransform: PanPinchTransformState,
  bounds: PanPinchBounds,
  limits: PanPinchScaleLimits
): PanPinchTransformState {
  const scale = clampPanPinchScale(nextTransform.scale, limits);
  const maxX = Math.max(0, (bounds.width * scale - bounds.width) / 2);
  const maxY = Math.max(0, (bounds.height * scale - bounds.height) / 2);

  return {
    scale,
    x: Math.min(maxX, Math.max(-maxX, nextTransform.x)),
    y: Math.min(maxY, Math.max(-maxY, nextTransform.y)),
  };
}

export function buildPanPinchZoomTransform({
  bounds,
  currentTransform,
  focalPoint,
  maxScale,
  minScale,
  requestedScale,
}: BuildPanPinchZoomTransformInput): PanPinchTransformState {
  const nextScale = clampPanPinchScale(requestedScale, { maxScale, minScale });
  const center = { x: bounds.width / 2, y: bounds.height / 2 };
  const scaleRatio = nextScale / currentTransform.scale;

  return clampPanPinchTransform(
    {
      scale: nextScale,
      x:
        (currentTransform.x - (focalPoint.x - center.x)) * scaleRatio +
        (focalPoint.x - center.x),
      y:
        (currentTransform.y - (focalPoint.y - center.y)) * scaleRatio +
        (focalPoint.y - center.y),
    },
    bounds,
    { maxScale, minScale }
  );
}

export function getPanPinchDistance(a: PanPinchPoint, b: PanPinchPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function isPanPinchDoubleTap({
  distancePx,
  elapsedMs,
  maxDistancePx = 20,
  maxElapsedMs = 280,
}: {
  distancePx: number;
  elapsedMs: number;
  maxDistancePx?: number;
  maxElapsedMs?: number;
}) {
  return elapsedMs < maxElapsedMs && distancePx < maxDistancePx;
}
