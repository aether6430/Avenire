"use client";

import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import { MagnifyingGlassPlus } from "@phosphor-icons/react";
import { MagnifyingGlassMinus } from "@phosphor-icons/react/MagnifyingGlassMinus";
import Image from "next/image";
import { usePanPinchImageViewer } from "../files/use-pan-pinch-image-viewer";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const BUTTON_ZOOM_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;
const WHEEL_ZOOM_STEP = 0.15;

export function ChatPanPinchImageViewer({
  alt,
  src,
}: {
  alt: string;
  src: string;
}) {
  const viewer = usePanPinchImageViewer({
    buttonZoomStep: BUTTON_ZOOM_STEP,
    doubleTapZoom: DOUBLE_TAP_ZOOM,
    maxScale: MAX_SCALE,
    minScale: MIN_SCALE,
    src,
    stopWheelPropagation: true,
    wheelZoomMode: "relative",
    wheelZoomStep: WHEEL_ZOOM_STEP,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-center gap-2 border-foreground/[0.06] border-b py-2">
        <Button
          aria-label="Zoom out"
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={viewer.transform.scale <= MIN_SCALE}
          onClick={viewer.zoomOut}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassMinus className="size-3.5" />
        </Button>
        <button
          aria-label="Reset zoom"
          className="min-w-[3.5rem] rounded px-2 py-0.5 text-center font-mono text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          onClick={viewer.resetView}
          type="button"
        >
          {Math.round(viewer.transform.scale * 100)}%
        </button>
        <Button
          aria-label="Zoom in"
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={viewer.transform.scale >= MAX_SCALE}
          onClick={viewer.zoomIn}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassPlus className="size-3.5" />
        </Button>
        {viewer.transform.scale > MIN_SCALE ? (
          <Button
            className="h-6 px-2 text-muted-foreground text-xs hover:text-foreground"
            onClick={viewer.resetView}
            type="button"
            variant="ghost"
          >
            Reset
          </Button>
        ) : null}
      </div>

      <div
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
          viewer.transform.scale > MIN_SCALE ? "cursor-grab" : "cursor-default",
          viewer.isDragging && viewer.transform.scale > MIN_SCALE
            ? "cursor-grabbing"
            : ""
        )}
        onPointerCancel={viewer.handlePointerUp}
        onPointerDown={viewer.handlePointerDown}
        onPointerMove={viewer.handlePointerMove}
        onPointerUp={viewer.handlePointerUp}
        onWheel={viewer.handleWheel}
        ref={viewer.containerRef}
        style={{
          overscrollBehavior: "contain",
          touchAction: "none",
          userSelect: "none",
        }}
      >
        <div
          style={{
            transform: `translate(${viewer.transform.x}px, ${viewer.transform.y}px) scale(${viewer.transform.scale})`,
            transformOrigin: "center center",
            transition: viewer.isDragging ? "none" : "transform 180ms ease-out",
            willChange: "transform",
          }}
        >
          <Image
            alt={alt}
            className="max-h-full max-w-full rounded object-contain"
            draggable={false}
            height={1200}
            onDragStart={(event) => {
              event.preventDefault();
            }}
            src={src}
            unoptimized
            width={1600}
          />
        </div>
        {viewer.transform.scale === MIN_SCALE ? (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white opacity-60 backdrop-blur-sm">
            Pinch or scroll to zoom · Double-tap to zoom in
          </div>
        ) : null}
      </div>
    </div>
  );
}
