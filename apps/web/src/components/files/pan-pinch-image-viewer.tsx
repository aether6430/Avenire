"use client";

import { Button } from "@avenire/ui/components/button";
import {
  ArrowCounterClockwise,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { usePanPinchImageViewer } from "./use-pan-pinch-image-viewer";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const BUTTON_ZOOM_STEP = 0.25;
const DOUBLE_TAP_ZOOM = 2.25;
const WHEEL_ZOOM_STEP = 0.2;

export function PanPinchImageViewer({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const viewer = usePanPinchImageViewer({
    buttonZoomStep: BUTTON_ZOOM_STEP,
    doubleTapZoom: DOUBLE_TAP_ZOOM,
    maxScale: MAX_SCALE,
    minScale: MIN_SCALE,
    preventNativeGestures: true,
    src,
    wheelZoomMode: "absolute",
    wheelZoomStep: WHEEL_ZOOM_STEP,
  });

  useEffect(() => {
    void src;
    setLoaded(false);
  }, [src]);

  return (
    <div
      className="group relative flex min-h-[62vh] w-full touch-none select-none items-center justify-center overflow-hidden overscroll-none rounded-none border-0 sm:min-h-[68vh] sm:rounded-2xl sm:border sm:border-border/60"
      onDoubleClick={viewer.handleDoubleClick}
      onPointerCancel={viewer.handlePointerUp}
      onPointerDown={viewer.handlePointerDown}
      onPointerMove={viewer.handlePointerMove}
      onPointerUp={viewer.handlePointerUp}
      onWheel={viewer.handleWheel}
      ref={viewer.containerRef}
      style={{
        cursor:
          viewer.transform.scale > MIN_SCALE
            ? viewer.isDragging
              ? "grabbing"
              : "grab"
            : "default",
        touchAction: "none",
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/55 to-transparent" />
      <div
        className={cn(
          "flex h-full w-full items-center justify-center px-4 py-5 transition-opacity sm:px-8 sm:py-8",
          loaded ? "opacity-100" : "opacity-0"
        )}
        style={{
          transform: `translate3d(${viewer.transform.x}px, ${viewer.transform.y}px, 0) scale(${viewer.transform.scale})`,
          transformOrigin: "center center",
          transition: viewer.isDragging
            ? "opacity 140ms ease-out"
            : "transform 140ms ease-out, opacity 140ms ease-out",
          willChange: "transform",
        }}
      >
        <Image
          alt={alt}
          className="block max-h-[76vh] w-auto max-w-full rounded-xl border border-white/70 bg-white/85 object-contain shadow-[0_24px_70px_rgba(15,23,42,0.14)] sm:max-h-[82vh]"
          draggable={false}
          height={1200}
          onDragStart={(event) => {
            event.preventDefault();
          }}
          onLoad={() => {
            setLoaded(true);
          }}
          src={src}
          unoptimized
          width={1600}
        />
      </div>

      {loaded ? null : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full border border-border/60 bg-background/92 px-3 py-1.5 text-muted-foreground text-xs shadow-sm backdrop-blur">
            Loading image...
          </div>
        </div>
      )}

      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-md border border-border/60 bg-background/92 p-1 shadow-sm backdrop-blur">
        <Button
          aria-label="Zoom out"
          className="size-8 rounded-md"
          onClick={viewer.zoomOut}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassMinus className="size-3.5" />
        </Button>
        <Button
          aria-label="Reset image view"
          className="h-8 min-w-12 rounded-md px-2 font-medium text-xs"
          onClick={viewer.resetView}
          type="button"
          variant="ghost"
        >
          {Math.round(viewer.transform.scale * 100)}%
        </Button>
        <Button
          aria-label="Zoom in"
          className="size-8 rounded-md"
          onClick={viewer.zoomIn}
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
          onClick={viewer.resetView}
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
