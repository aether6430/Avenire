"use client";

import { Button } from "@avenire/ui/components/button";
import {
  ArrowCounterClockwise,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { cn } from "@/lib/utils";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.2;
const DOUBLE_TAP_ZOOM = 2.25;

type Point = {
  x: number;
  y: number;
};

type TransformState = {
  scale: number;
  x: number;
  y: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function PanPinchImageViewer({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pointersRef = useRef<Map<number, Point>>(new Map());
  const dragOriginRef = useRef<Point | null>(null);
  const lastPinchDistanceRef = useRef<number | null>(null);
  const lastTapRef = useRef<{ point: Point; timestamp: number } | null>(null);
  const transformRef = useRef<TransformState>({ scale: 1, x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [transform, setTransform] = useState<TransformState>({
    scale: 1,
    x: 0,
    y: 0,
  });

  const commitTransform = useCallback((nextTransform: TransformState) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const bounds = container.getBoundingClientRect();
    const maxX = Math.max(0, (bounds.width * nextTransform.scale - bounds.width) / 2);
    const maxY = Math.max(0, (bounds.height * nextTransform.scale - bounds.height) / 2);
    const clamped = {
      scale: clamp(nextTransform.scale, MIN_SCALE, MAX_SCALE),
      x: clamp(nextTransform.x, -maxX, maxX),
      y: clamp(nextTransform.y, -maxY, maxY),
    };

    transformRef.current = clamped;
    setTransform(clamped);
  }, []);

  const resetView = useCallback(() => {
    commitTransform({ scale: 1, x: 0, y: 0 });
  }, [commitTransform]);

  const zoomTo = useCallback(
    (requestedScale: number, focalPoint?: Point) => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const current = transformRef.current;
      const nextScale = clamp(requestedScale, MIN_SCALE, MAX_SCALE);
      const bounds = container.getBoundingClientRect();
      const center = { x: bounds.width / 2, y: bounds.height / 2 };
      const focal = focalPoint ?? center;
      const scaleRatio = nextScale / current.scale;

      commitTransform({
        scale: nextScale,
        x: (current.x - (focal.x - center.x)) * scaleRatio + (focal.x - center.x),
        y: (current.y - (focal.y - center.y)) * scaleRatio + (focal.y - center.y),
      });
    },
    [commitTransform]
  );

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
          now - previousTap.timestamp < 280 &&
          getDistance(previousTap.point, nextPoint) < 20
        ) {
          const container = containerRef.current?.getBoundingClientRect();
          if (container) {
            if (transformRef.current.scale > 1) {
              resetView();
            } else {
              zoomTo(DOUBLE_TAP_ZOOM, {
                x: event.clientX - container.left,
                y: event.clientY - container.top,
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
          lastPinchDistanceRef.current = getDistance(first, second);
        }
      }
    },
    [resetView, zoomTo]
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
        const container = containerRef.current?.getBoundingClientRect();
        if (!first || !second || !container) {
          return;
        }

        const pinchDistance = getDistance(first, second);
        const lastDistance = lastPinchDistanceRef.current;
        if (lastDistance) {
          zoomTo(transformRef.current.scale * (pinchDistance / lastDistance), {
            x: (first.x + second.x) / 2 - container.left,
            y: (first.y + second.y) / 2 - container.top,
          });
        }
        lastPinchDistanceRef.current = pinchDistance;
        return;
      }

      if (transformRef.current.scale <= 1 || !dragOriginRef.current) {
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
    [commitTransform, zoomTo]
  );

  const releasePointer = useCallback((pointerId: number) => {
    pointersRef.current.delete(pointerId);
    setIsDragging(false);
    lastPinchDistanceRef.current = null;

    if (pointersRef.current.size === 1) {
      dragOriginRef.current = Array.from(pointersRef.current.values())[0] ?? null;
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

      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) {
        return;
      }

      const delta = event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
      zoomTo(transformRef.current.scale + delta, {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
    },
    [zoomTo]
  );

  useEffect(() => {
    setLoaded(false);
    resetView();
  }, [resetView, src]);

  useEffect(() => {
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
  }, []);

  return (
    <div
      ref={containerRef}
      className="group relative flex min-h-[62vh] w-full items-center justify-center overflow-hidden rounded-none border-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.98),_rgba(244,244,245,0.92)_44%,_rgba(228,228,231,0.86)_100%)] overscroll-none select-none touch-none sm:min-h-[68vh] sm:rounded-2xl sm:border sm:border-border/60"
      onDoubleClick={() => {
        if (transformRef.current.scale > 1) {
          resetView();
          return;
        }

        const bounds = containerRef.current?.getBoundingClientRect();
        if (!bounds) {
          return;
        }

        zoomTo(DOUBLE_TAP_ZOOM, { x: bounds.width / 2, y: bounds.height / 2 });
      }}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      style={{
        cursor: transform.scale > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        touchAction: "none",
      }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.28),transparent_45%,rgba(24,24,27,0.06))]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/55 to-transparent" />

      <div
        className={cn(
          "flex h-full w-full items-center justify-center px-4 py-5 transition-opacity sm:px-8 sm:py-8",
          loaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
          transformOrigin: "center center",
          transition: isDragging
            ? "opacity 140ms ease-out"
            : "transform 140ms ease-out, opacity 140ms ease-out",
          willChange: "transform",
        }}
      >
        <img
          alt={alt}
          className="block max-h-[76vh] w-auto max-w-full rounded-xl border border-white/70 bg-white/85 object-contain shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:max-h-[82vh]"
          draggable={false}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          onLoad={() => {
            setLoaded(true);
          }}
          src={src}
        />
      </div>

      {!loaded ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-border/60 bg-background/92 px-3 py-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
            Loading image...
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-border/60 bg-background/92 p-1 shadow-sm backdrop-blur">
        <Button
          aria-label="Zoom out"
          className="size-8 rounded-md"
          onClick={() => zoomTo(transformRef.current.scale - 0.25)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassMinus className="size-3.5" />
        </Button>
        <Button
          aria-label="Reset image view"
          className="h-8 min-w-12 rounded-md px-2 text-xs font-medium"
          onClick={resetView}
          type="button"
          variant="ghost"
        >
          {Math.round(transform.scale * 100)}%
        </Button>
        <Button
          aria-label="Zoom in"
          className="size-8 rounded-md"
          onClick={() => zoomTo(transformRef.current.scale + 0.25)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassPlus className="size-3.5" />
        </Button>
        <div className="mx-0.5 h-5 w-px bg-border/70" />
        <Button
          aria-label="Reset image position"
          className="size-8 rounded-md"
          onClick={resetView}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowCounterClockwise className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
