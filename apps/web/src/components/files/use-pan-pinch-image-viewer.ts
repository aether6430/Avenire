"use client";

import {
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  buildPanPinchZoomTransform,
  clampPanPinchTransform,
  getPanPinchDistance,
  isPanPinchDoubleTap,
  type PanPinchPoint,
  type PanPinchTransformState,
} from "@/components/files/pan-pinch-image-model";

interface UsePanPinchImageViewerOptions {
  buttonZoomStep?: number;
  doubleTapDistancePx?: number;
  doubleTapThresholdMs?: number;
  doubleTapZoom?: number;
  maxScale?: number;
  minScale?: number;
  preventNativeGestures?: boolean;
  src: string;
  stopWheelPropagation?: boolean;
  wheelZoomMode?: "absolute" | "relative";
  wheelZoomStep?: number;
}

export function usePanPinchImageViewer({
  buttonZoomStep = 0.25,
  doubleTapDistancePx = 20,
  doubleTapThresholdMs = 280,
  doubleTapZoom = 2.25,
  maxScale = 5,
  minScale = 1,
  preventNativeGestures = false,
  src,
  stopWheelPropagation = false,
  wheelZoomMode = "absolute",
  wheelZoomStep = 0.2,
}: UsePanPinchImageViewerOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, PanPinchPoint>>(new Map());
  const dragOriginRef = useRef<PanPinchPoint | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<{
    point: PanPinchPoint;
    timestamp: number;
  } | null>(null);
  const transformRef = useRef<PanPinchTransformState>({
    scale: minScale,
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [transform, setTransform] = useState<PanPinchTransformState>(
    transformRef.current
  );

  const commitTransform = useCallback(
    (nextTransform: PanPinchTransformState) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      const clamped = clampPanPinchTransform(
        nextTransform,
        { height: bounds.height, width: bounds.width },
        { maxScale, minScale }
      );

      transformRef.current = clamped;
      setTransform(clamped);
    },
    [maxScale, minScale]
  );

  const resetView = useCallback(() => {
    const reset = { scale: minScale, x: 0, y: 0 };
    transformRef.current = reset;
    setTransform(reset);
    setIsDragging(false);
  }, [minScale]);

  const zoomTo = useCallback(
    (requestedScale: number, focalPoint?: PanPinchPoint) => {
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      commitTransform(
        buildPanPinchZoomTransform({
          bounds: { height: bounds.height, width: bounds.width },
          currentTransform: transformRef.current,
          focalPoint: focalPoint ?? {
            x: bounds.width / 2,
            y: bounds.height / 2,
          },
          maxScale,
          minScale,
          requestedScale,
        })
      );
    },
    [commitTransform, maxScale, minScale]
  );

  const zoomIn = useCallback(() => {
    zoomTo(transformRef.current.scale + buttonZoomStep);
  }, [buttonZoomStep, zoomTo]);

  const zoomOut = useCallback(() => {
    zoomTo(transformRef.current.scale - buttonZoomStep);
  }, [buttonZoomStep, zoomTo]);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);

      const nextPoint = { x: event.clientX, y: event.clientY };
      pointersRef.current.set(event.pointerId, nextPoint);

      if (pointersRef.current.size === 1) {
        const previousTap = lastTapRef.current;
        const now = Date.now();
        if (
          previousTap &&
          isPanPinchDoubleTap({
            distancePx: getPanPinchDistance(previousTap.point, nextPoint),
            elapsedMs: now - previousTap.timestamp,
            maxDistancePx: doubleTapDistancePx,
            maxElapsedMs: doubleTapThresholdMs,
          })
        ) {
          const bounds = containerRef.current?.getBoundingClientRect();
          if (bounds) {
            if (transformRef.current.scale > minScale) {
              resetView();
            } else {
              zoomTo(doubleTapZoom, {
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
              });
            }
          }
          lastTapRef.current = null;
          dragOriginRef.current = null;
          return;
        }

        lastTapRef.current = { point: nextPoint, timestamp: now };
        dragOriginRef.current = nextPoint;
        lastPinchDistanceRef.current = null;
        return;
      }

      if (pointersRef.current.size === 2) {
        dragOriginRef.current = null;
        const [first, second] = Array.from(pointersRef.current.values());
        if (first && second) {
          lastPinchDistanceRef.current = getPanPinchDistance(first, second);
        }
      }
    },
    [
      doubleTapDistancePx,
      doubleTapThresholdMs,
      doubleTapZoom,
      minScale,
      resetView,
      zoomTo,
    ]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!pointersRef.current.has(event.pointerId)) {
        return;
      }

      event.preventDefault();
      const nextPoint = { x: event.clientX, y: event.clientY };
      pointersRef.current.set(event.pointerId, nextPoint);

      if (pointersRef.current.size === 2) {
        const [first, second] = Array.from(pointersRef.current.values());
        const bounds = containerRef.current?.getBoundingClientRect();
        if (!(first && second && bounds)) {
          return;
        }

        const pinchDistance = getPanPinchDistance(first, second);
        const lastDistance = lastPinchDistanceRef.current;
        if (lastDistance) {
          zoomTo(transformRef.current.scale * (pinchDistance / lastDistance), {
            x: (first.x + second.x) / 2 - bounds.left,
            y: (first.y + second.y) / 2 - bounds.top,
          });
        }
        lastPinchDistanceRef.current = pinchDistance;
        return;
      }

      if (transformRef.current.scale <= minScale || !dragOriginRef.current) {
        return;
      }

      setIsDragging(true);
      commitTransform({
        ...transformRef.current,
        x: transformRef.current.x + (nextPoint.x - dragOriginRef.current.x),
        y: transformRef.current.y + (nextPoint.y - dragOriginRef.current.y),
      });
      dragOriginRef.current = nextPoint;
    },
    [commitTransform, minScale, zoomTo]
  );

  const releasePointer = useCallback((pointerId: number) => {
    pointersRef.current.delete(pointerId);
    setIsDragging(false);
    lastPinchDistanceRef.current = null;

    if (pointersRef.current.size === 1) {
      dragOriginRef.current =
        Array.from(pointersRef.current.values())[0] ?? null;
      return;
    }

    dragOriginRef.current = null;
  }, []);

  const handlePointerUp = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      releasePointer(event.pointerId);
    },
    [releasePointer]
  );

  const handleWheel = useCallback(
    (event: ReactWheelEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (stopWheelPropagation) {
        event.stopPropagation();
      }

      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      const delta = event.deltaY > 0 ? -wheelZoomStep : wheelZoomStep;
      const requestedScale =
        wheelZoomMode === "relative"
          ? transformRef.current.scale + delta * transformRef.current.scale
          : transformRef.current.scale + delta;

      zoomTo(requestedScale, {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    [stopWheelPropagation, wheelZoomMode, wheelZoomStep, zoomTo]
  );

  const handleDoubleClick = useCallback(() => {
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds) {
      return;
    }

    if (transformRef.current.scale > minScale) {
      resetView();
      return;
    }

    zoomTo(doubleTapZoom, {
      x: bounds.width / 2,
      y: bounds.height / 2,
    });
  }, [doubleTapZoom, minScale, resetView, zoomTo]);

  useEffect(() => {
    pointersRef.current.clear();
    dragOriginRef.current = null;
    lastPinchDistanceRef.current = null;
    lastTapRef.current = null;
    resetView();
  }, [resetView]);

  useEffect(() => {
    if (!preventNativeGestures) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const preventGesture = (event: Event) => {
      event.preventDefault();
    };

    container.addEventListener("gesturestart", preventGesture);
    container.addEventListener("gesturechange", preventGesture);
    container.addEventListener("gestureend", preventGesture);

    return () => {
      container.removeEventListener("gesturestart", preventGesture);
      container.removeEventListener("gesturechange", preventGesture);
      container.removeEventListener("gestureend", preventGesture);
    };
  }, [preventNativeGestures]);

  return {
    containerRef,
    handleDoubleClick,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleWheel,
    isDragging,
    resetView,
    transform,
    zoomIn,
    zoomOut,
    zoomTo,
  };
}
