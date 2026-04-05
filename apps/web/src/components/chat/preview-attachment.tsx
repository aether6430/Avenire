"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, } from "@avenire/ui/components/dialog";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "@avenire/ui/components/tooltip";
import {
  FileMediaPlayer, type MediaPlaybackSource, useMediaPlaybackSource, } from "@avenire/ui/media";
import { Spinner } from "@avenire/ui/components/spinner";
import { File, FileCode as FileCode2, MagnifyingGlassMinus, MagnifyingGlassPlus, SpinnerGap as LoaderIcon, X } from "@phosphor-icons/react"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Attachment } from "@/components/chat/attachment";
import {
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
  resolveCachedPlaybackSource,
} from "@/lib/file-preview-cache";
import {
  buildProgressivePlaybackSource,
  type MediaPlaybackDescriptor,
} from "@/lib/media-playback";
import { cn } from "@/lib/utils";

// ─── Pan/Pinch Image Viewer ───────────────────────────────────────────────────

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const ZOOM_STEP = 0.5;
const DOUBLE_TAP_ZOOM = 2.5;

function PanPinchImageViewer({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [isPanning, setIsPanning] = useState(false);

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 35, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 300, damping: 35, mass: 0.6 });

  // Pointer tracking refs (supports touch + mouse)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null);
  const activePointersRef = useRef<Map<number, PointerEvent>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const clampPosition = useCallback(
    (nextX: number, nextY: number, currentScale: number) => {
      const container = containerRef.current;
      if (!container) return { x: nextX, y: nextY };

      const { width, height } = container.getBoundingClientRect();
      const maxX = Math.max(0, (width * currentScale - width) / 2);
      const maxY = Math.max(0, (height * currentScale - height) / 2);

      return {
        x: Math.max(-maxX, Math.min(maxX, nextX)),
        y: Math.max(-maxY, Math.min(maxY, nextY)),
      };
    },
    []
  );

  const resetView = useCallback(() => {
    setScale(1);
    x.set(0);
    y.set(0);
  }, [x, y]);

  const zoomTo = useCallback(
    (nextScale: number, focalX?: number, focalY?: number) => {
      const container = containerRef.current;
      if (!container) return;

      const clamped = Math.max(MIN_SCALE, Math.min(MAX_SCALE, nextScale));
      const { width, height } = container.getBoundingClientRect();
      const cx = focalX ?? width / 2;
      const cy = focalY ?? height / 2;

      // Adjust pan so zoom is centered on focal point
      const prevScale = scale;
      const scaleDelta = clamped / prevScale;
      const nextX = (x.get() - (cx - width / 2)) * scaleDelta + (cx - width / 2);
      const nextY = (y.get() - (cy - height / 2)) * scaleDelta + (cy - height / 2);
      const clamped2 = clampPosition(nextX, nextY, clamped);

      setScale(clamped);
      x.set(clamped2.x);
      y.set(clamped2.y);
    },
    [scale, x, y, clampPosition]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      activePointersRef.current.set(e.pointerId, e.nativeEvent);

      if (activePointersRef.current.size === 1) {
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
        setIsPanning(true);

        // Double-tap detection
        const now = Date.now();
        const dx = Math.abs(e.clientX - lastTapPosRef.current.x);
        const dy = Math.abs(e.clientY - lastTapPosRef.current.y);
        if (now - lastTapTimeRef.current < 300 && dx < 20 && dy < 20) {
          // Double tap
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const focalX = e.clientX - rect.left;
          const focalY = e.clientY - rect.top;
          if (scale > 1) {
            resetView();
          } else {
            zoomTo(DOUBLE_TAP_ZOOM, focalX, focalY);
          }
          lastTapTimeRef.current = 0;
          return;
        }
        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: e.clientX, y: e.clientY };
        lastPinchDistRef.current = null;
      } else if (activePointersRef.current.size === 2) {
        // Starting pinch
        setIsPanning(false);
        lastPointerRef.current = null;
        const pointers = Array.from(activePointersRef.current.values());
        const [p1, p2] = pointers;
        if (p1 && p2) {
          const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
          lastPinchDistRef.current = dist;
        }
      }
    },
    [scale, resetView, zoomTo]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointersRef.current.set(e.pointerId, e.nativeEvent);

      if (activePointersRef.current.size === 2) {
        // Pinch zoom
        const pointers = Array.from(activePointersRef.current.values());
        const [p1, p2] = pointers;
        if (!p1 || !p2) return;

        const dist = Math.hypot(p2.clientX - p1.clientX, p2.clientY - p1.clientY);
        const lastDist = lastPinchDistRef.current;
        if (lastDist !== null) {
          const container = containerRef.current;
          if (!container) return;
          const rect = container.getBoundingClientRect();
          const midX = (p1.clientX + p2.clientX) / 2 - rect.left;
          const midY = (p1.clientY + p2.clientY) / 2 - rect.top;
          const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * (dist / lastDist)));
          zoomTo(nextScale, midX, midY);
        }
        lastPinchDistRef.current = dist;
        return;
      }

      if (activePointersRef.current.size === 1 && lastPointerRef.current && scale > 1) {
        // Pan
        const dx = e.clientX - lastPointerRef.current.x;
        const dy = e.clientY - lastPointerRef.current.y;
        const clamped = clampPosition(x.get() + dx, y.get() + dy, scale);
        x.set(clamped.x);
        y.set(clamped.y);
        lastPointerRef.current = { x: e.clientX, y: e.clientY };
      }
    },
    [scale, x, y, clampPosition, zoomTo]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      activePointersRef.current.delete(e.pointerId);
      lastPinchDistRef.current = null;

      if (activePointersRef.current.size === 0) {
        setIsPanning(false);
        lastPointerRef.current = null;
      } else if (activePointersRef.current.size === 1) {
        // One finger remaining, update last pointer
        const remaining = Array.from(activePointersRef.current.values())[0];
        if (remaining) lastPointerRef.current = { x: remaining.clientX, y: remaining.clientY };
      }
    },
    []
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      e.preventDefault();
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const focalX = e.clientX - rect.left;
      const focalY = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      zoomTo(scale + delta * scale, focalX, focalY);
    },
    [scale, zoomTo]
  );

  // Reset position when scale returns to 1
  useEffect(() => {
    if (scale <= 1) {
      x.set(0);
      y.set(0);
    }
  }, [scale, x, y]);

  const scalePercent = Math.round(scale * 100);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-center gap-2 border-b border-foreground/[0.06] py-2">
        <Button
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={scale <= MIN_SCALE}
          onClick={() => zoomTo(scale - ZOOM_STEP)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassMinus className="size-3.5" />
        </Button>
        <button
          className="min-w-[3.5rem] rounded px-2 py-0.5 text-center font-mono text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={resetView}
          type="button"
        >
          {scalePercent}%
        </button>
        <Button
          className="size-7 text-muted-foreground hover:text-foreground"
          disabled={scale >= MAX_SCALE}
          onClick={() => zoomTo(scale + ZOOM_STEP)}
          size="icon"
          type="button"
          variant="ghost"
        >
          <MagnifyingGlassPlus className="size-3.5" />
        </Button>
        {scale > 1 && (
          <Button
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            onClick={resetView}
            type="button"
            variant="ghost"
          >
            Reset
          </Button>
        )}
      </div>

      {/* Viewer */}
      <div
        className={cn(
          "relative flex min-h-0 flex-1 items-center justify-center overflow-hidden",
          scale > 1 ? "cursor-grab" : "cursor-default",
          isPanning && scale > 1 ? "cursor-grabbing" : ""
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        ref={containerRef}
        style={{ touchAction: "none", userSelect: "none" }}
      >
        <motion.img
          alt={alt}
          className="max-h-full max-w-full rounded object-contain"
          draggable={false}
          src={src}
          style={{
            scale,
            x: springX,
            y: springY,
            willChange: "transform",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 35 }}
        />
        {scale === 1 && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/40 px-2.5 py-1 text-[10px] text-white backdrop-blur-sm opacity-60">
            Pinch or scroll to zoom · Double-tap to zoom in
          </div>
        )}
      </div>
    </div>
  );
}

const PDFViewer = dynamic(() => import("@/components/files/pdf-viewer"), {
  ssr: false,
  loading: () => (
    <div className="inline-flex items-center gap-2 p-4 text-muted-foreground text-sm">
      <Spinner className="size-4" />
      Loading PDF...
    </div>
  ),
});

const CODE_MIME_MATCHERS = [
  "application/json",
  "application/javascript",
  "application/typescript",
  "text/javascript",
  "text/typescript",
  "text/x-python",
  "text/x-c",
  "text/x-c++",
  "text/x-java",
  "text/x-rust",
  "text/html",
  "text/css",
];

const CODE_EXTENSIONS = [
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "py",
  "md",
  "go",
  "rs",
  "java",
  "cpp",
  "c",
  "sql",
  "yaml",
  "yml",
  "sh",
];

const isCodeLike = (contentType?: string, name?: string) => {
  if (!(contentType || name)) {
    return false;
  }
  if (
    contentType &&
    (CODE_MIME_MATCHERS.includes(contentType) ||
      contentType.startsWith("text/"))
  ) {
    return true;
  }

  const extension = name?.split(".").pop()?.toLowerCase();
  return Boolean(extension && CODE_EXTENSIONS.includes(extension));
};

const playbackDescriptorCache = new Map<
  string,
  MediaPlaybackDescriptor | Promise<MediaPlaybackDescriptor | null> | null
>();

const attachmentPreviewDialogClassName =
  "h-[100dvh] w-screen max-w-none rounded-none border-0 p-0 sm:h-[92vh] sm:w-[96vw] sm:max-w-[1200px] sm:rounded-xl sm:border lg:max-w-[1280px]";

async function fetchWorkspacePlaybackDescriptor(
  workspaceUuid: string,
  workspaceFileId: string
) {
  const cacheKey = `${workspaceUuid}:${workspaceFileId}`;
  const cached = playbackDescriptorCache.get(cacheKey);
  if (cached && !(cached instanceof Promise)) {
    return cached;
  }
  if (cached instanceof Promise) {
    return await cached;
  }

  const request = fetch(
    `/api/workspaces/${workspaceUuid}/files/${workspaceFileId}/playback`,
    {
      cache: "force-cache",
      credentials: "include",
    }
  )
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }
      return (await response.json()) as MediaPlaybackDescriptor;
    })
    .catch(() => null)
    .finally(() => {
      const current = playbackDescriptorCache.get(cacheKey);
      if (current === request) {
        playbackDescriptorCache.delete(cacheKey);
      }
    });

  playbackDescriptorCache.set(cacheKey, request);
  const resolved = await request;
  if (resolved?.status === "ready") {
    playbackDescriptorCache.set(cacheKey, resolved);
  } else {
    playbackDescriptorCache.delete(cacheKey);
  }
  return resolved;
}

function InlineVideoPreview({
  autoPlay = false,
  className,
  muted = true,
  playbackSource,
  posterUrl,
}: {
  autoPlay?: boolean;
  className?: string;
  muted?: boolean;
  playbackSource: MediaPlaybackSource;
  posterUrl?: string | null;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedSource, setResolvedSource] = useState(() =>
    resolveCachedPlaybackSource(playbackSource)
  );

  useMediaPlaybackSource({
    mediaRef: videoRef,
    playbackSource: resolvedSource,
  });

  useEffect(() => {
    setResolvedSource(resolveCachedPlaybackSource(playbackSource));
  }, [playbackSource]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!autoPlay) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const startPlayback = async () => {
      try {
        video.loop = true;
        await video.play();
      } catch {
        // Browser may require a gesture.
      }
    };
    startPlayback().catch(() => undefined);

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [autoPlay, resolvedSource]);

  return (
    <video
      className={className}
      muted={muted}
      playsInline
      poster={posterUrl ?? undefined}
      preload={autoPlay ? "auto" : "metadata"}
      ref={videoRef}
    />
  );
}

export function PreviewAttachment({
  attachment,
  onRemove,
  variant = "default",
  workspaceUuid,
}: {
  attachment: Partial<Attachment>;
  onRemove?: (attachmentId: string) => void;
  variant?: "composer" | "default" | "tag";
  workspaceUuid?: string;
}) {
  const {
    id,
    name,
    url,
    contentType,
    status,
    file,
    errorMessage,
    source,
    sizeBytes,
    workspaceFileId,
  } = attachment;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [playbackDescriptor, setPlaybackDescriptor] =
    useState<MediaPlaybackDescriptor | null>(null);
  const [textPreview, setTextPreview] = useState<string | null>(null);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const workspaceStreamUrl =
    source === "workspace" && workspaceUuid && workspaceFileId
      ? `/api/workspaces/${workspaceUuid}/files/${workspaceFileId}/stream`
      : null;
  const previewUrl = workspaceStreamUrl ?? url;

  const fileSize = useMemo(() => {
    const resolvedSize = file?.size ?? sizeBytes;
    if (!resolvedSize) {
      return "";
    }
    const sizeInKB = resolvedSize / 1024;
    if (sizeInKB < 1024) {
      return `${sizeInKB.toFixed(1)}KB`;
    }
    return `${(sizeInKB / 1024).toFixed(1)}MB`;
  }, [file?.size, sizeBytes]);

  const canPreview = useMemo(
    () =>
      status === "completed" &&
      Boolean(
        (contentType?.startsWith("image") ||
          contentType?.startsWith("video") ||
          contentType === "application/pdf" ||
          isCodeLike(contentType, name)) &&
          previewUrl
      ),
    [contentType, name, previewUrl, status]
  );

  useEffect(() => {
    if (
      contentType?.startsWith("video") &&
      status === "completed" &&
      url &&
      source === "workspace" &&
      workspaceUuid &&
      workspaceFileId
    ) {
      fetchWorkspacePlaybackDescriptor(workspaceUuid, workspaceFileId).then(
        (descriptor) => {
          setPlaybackDescriptor(
            descriptor ??
              ({
                fallbackSource: buildProgressivePlaybackSource(
                  url,
                  contentType
                ),
                posterUrl: null,
                preferredSource: buildProgressivePlaybackSource(
                  url,
                  contentType
                ),
                status: "ready",
              } satisfies MediaPlaybackDescriptor)
          );
        }
      );
      return;
    }

    if (contentType?.startsWith("video") && status === "completed" && url) {
      const progressive = buildProgressivePlaybackSource(url, contentType);
      setPlaybackDescriptor({
        fallbackSource: progressive,
        posterUrl: null,
        preferredSource: progressive,
        status: "ready",
      });
      return;
    }

    setPlaybackDescriptor(null);
  }, [contentType, source, status, url, workspaceFileId, workspaceUuid]);

  useEffect(() => {
    if (
      !(
        contentType?.startsWith("video") &&
        playbackDescriptor &&
        (isHovered || isModalOpen)
      )
    ) {
      return;
    }

    primeMediaPlayback(playbackDescriptor.preferredSource, {
      mediaType: "video",
      posterUrl: playbackDescriptor.posterUrl,
      sizeBytes,
      surface: "attachment",
    }).catch(() => undefined);
    return () => {
      releaseMediaPlaybackPrime(playbackDescriptor.preferredSource);
    };
  }, [contentType, isHovered, isModalOpen, playbackDescriptor, sizeBytes]);

  const loadTextPreview = async () => {
    if (
      !previewUrl ||
      status !== "completed" ||
      !isCodeLike(contentType, name) ||
      textPreview ||
      isLoadingText
    ) {
      return;
    }

    setIsLoadingText(true);
    try {
      if (file) {
        setTextPreview(await file.text());
      } else if (source === "workspace" && workspaceUuid && workspaceFileId) {
        const response = await fetch(
          `/api/workspaces/${workspaceUuid}/files/${workspaceFileId}/stream`,
          {
            headers: {
              Accept: "text/plain,text/markdown,text/*,*/*",
            },
          }
        );
        if (!response.ok) {
          throw new Error(`Failed to load preview: ${response.status}`);
        }
        setTextPreview(await response.text());
      } else {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to load preview: ${response.status}`);
        }
        setTextPreview(await response.text());
      }
    } catch {
      toast.error("Failed to load code preview");
    } finally {
      setIsLoadingText(false);
    }
  };

  const renderThumbnail = () => {
    if (contentType?.startsWith("image") && url) {
      return (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
          <img
            alt={name ?? "An image attachment"}
            className="h-full w-full object-cover"
            height={48}
            src={url}
            width={48}
          />
          {(status === "uploading" || status === "pending") && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <LoaderIcon className="h-4 w-4 animate-spin text-white" />
            </div>
          )}
        </div>
      );
    }

    if (contentType?.startsWith("video") && url) {
      return (
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
          {playbackDescriptor?.posterUrl ? (
            <img
              alt={name ?? "A video attachment"}
              className="h-full w-full object-cover"
              height={48}
              src={playbackDescriptor.posterUrl}
              width={48}
            />
          ) : (
            <video className="h-full w-full object-cover" muted src={url} />
          )}
          {(status === "uploading" || status === "pending") && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
              <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
            </div>
          )}
        </div>
      );
    }

    if (contentType === "application/pdf") {
      return (
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-red-200 bg-red-50 font-semibold text-[10px] text-red-600">
          PDF
          {(status === "uploading" || status === "pending") && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
              <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
            </div>
          )}
        </div>
      );
    }

    if (isCodeLike(contentType, name)) {
      return (
        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-green-200 bg-green-50">
          <FileCode2 className="h-5 w-5 text-green-700" />
          {(status === "uploading" || status === "pending") && (
            <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
              <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
        <File className="h-6 w-6 text-muted-foreground" />
        {(status === "uploading" || status === "pending") && (
          <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
            <LoaderIcon className="h-4 w-4 animate-spin text-foreground" />
          </div>
        )}
      </div>
    );
  };

  const renderPillIcon = () => {
    const isBusy = status === "uploading" || status === "pending";

    return (
      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground">
        <File className="h-4 w-4" />
        {isBusy ? (
          <span className="absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-background">
            <LoaderIcon className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
          </span>
        ) : null}
      </div>
    );
  };

  const renderHoverPreview = () => {
    if (contentType?.startsWith("image") && url && status === "completed") {
      return (
        <div className="max-w-xs">
          <img
            alt={name ?? "Preview"}
            className="max-h-48 max-w-full rounded-md object-cover"
            height={192}
            src={url}
            width={320}
          />
        </div>
      );
    }

    if (contentType?.startsWith("video") && url && status === "completed") {
      return (
        <div className="max-w-xs">
          {playbackDescriptor ? (
            <InlineVideoPreview
              autoPlay
              className="max-h-48 max-w-full rounded-md"
              playbackSource={playbackDescriptor.preferredSource}
              posterUrl={playbackDescriptor.posterUrl}
            />
          ) : (
            <video
              className="max-h-48 max-w-full rounded-md"
              controls
              src={url}
            >
              <track kind="captions" />
            </video>
          )}
        </div>
      );
    }

    if (isCodeLike(contentType, name) && textPreview) {
      return (
        <div className="max-w-xs rounded-md bg-muted p-3">
          <pre className="whitespace-pre-wrap font-mono text-xs">
            {textPreview.substring(0, 300) +
              (textPreview.length > 300 ? "..." : "")}
          </pre>
        </div>
      );
    }

    return null;
  };

  const isImagePreview =
    contentType?.startsWith("image") && previewUrl && status === "completed";

  const renderModalContent = () => {
    if (isImagePreview && previewUrl) {
      return (
        <PanPinchImageViewer
          alt={name ?? "Image preview"}
          src={previewUrl}
        />
      );
    }

    if (
      contentType?.startsWith("video") &&
      previewUrl &&
      status === "completed"
    ) {
      return (
        <div className="flex justify-center">
          {playbackDescriptor ? (
            <FileMediaPlayer
              className="w-full max-w-4xl"
              kind="video"
              name={name ?? "Video attachment"}
              openedCached
              playbackSource={playbackDescriptor.preferredSource}
              posterUrl={playbackDescriptor.posterUrl}
            />
          ) : (
            <video
              className="max-h-[70vh] max-w-full rounded-md object-contain"
              controls
              src={previewUrl}
            >
              <track kind="captions" />
            </video>
          )}
        </div>
      );
    }

    if (
      contentType === "application/pdf" &&
      previewUrl &&
      status === "completed"
    ) {
      if (previewUrl.startsWith("blob:")) {
        return (
          <iframe
            className="h-[75vh] w-full rounded-md border"
            src={previewUrl}
            title={name ?? "PDF preview"}
          />
        );
      }

      return (
        <div className="h-[75vh]">
          <PDFViewer className="h-full w-full" source={previewUrl} />
        </div>
      );
    }

    if (isCodeLike(contentType, name) && status === "completed") {
      return (
        <div className="max-h-[70vh] overflow-auto">
          {isLoadingText ? (
            <p className="inline-flex items-center gap-2 p-4 text-muted-foreground text-sm">
              <Spinner className="size-4" />
              Loading preview...
            </p>
          ) : (
            <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 font-mono text-sm">
              {textPreview ?? "No preview available."}
            </pre>
          )}
        </div>
      );
    }

    return (
      <div className="py-8 text-center">
        <File className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
        <p className="text-muted-foreground">
          Preview not available for this file type
        </p>
      </div>
    );
  };

  if (variant === "composer") {
    return (
      <TooltipProvider delay={280}>
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className="group relative"
          exit={{ opacity: 0, scale: 0.92 }}
          initial={{ opacity: 0, scale: 0.92 }}
          transition={{ duration: 0.18 }}
        >
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  aria-label={name ?? "Attachment"}
                  className={cn(
                    "relative flex h-7 min-w-0 max-w-[240px] items-center gap-1.5 overflow-hidden rounded-md border border-border/80 bg-background px-2.5 pr-7 text-left transition-colors hover:bg-muted"
                  )}
                  onBlur={() => setIsHovered(false)}
                  onClick={() => {
                    setIsModalOpen(true);
                    if (canPreview) {
                      loadTextPreview().catch(() => undefined);
                    }
                  }}
                  onFocus={() => setIsHovered(true)}
                  onMouseEnter={() => {
                    setIsHovered(true);
                    loadTextPreview().catch(() => undefined);
                  }}
                  onMouseLeave={() => setIsHovered(false)}
                  type="button"
                  variant="ghost"
                />
              }
            >
              {renderPillIcon()}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-[12px] text-foreground leading-none">
                  {name ?? "Unnamed file"}
                </p>
              </div>

              {onRemove && id ? (
                <Button
                  className="absolute top-1/2 right-1 z-10 h-4.5 w-4.5 -translate-y-1/2 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(id);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-2.5 w-2.5" />
                </Button>
              ) : null}
            </TooltipTrigger>

            <TooltipContent className="p-2" side="top">
              {renderHoverPreview() || (
                <div className="max-w-xs">
                  <p className="font-medium text-sm">{name ?? "Attachment"}</p>
                  {(fileSize || source === "workspace") && (
                    <p className="text-muted-foreground text-xs">
                      {[
                        fileSize,
                        source === "workspace" ? "Workspace file" : null,
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </p>
                  )}
                </div>
              )}
            </TooltipContent>
          </Tooltip>

          <Dialog
            onOpenChange={(nextOpen) => {
              setIsModalOpen(nextOpen);
              if (!nextOpen) {
                setIsHovered(false);
              }
            }}
            open={isModalOpen}
          >
            <DialogContent className={attachmentPreviewDialogClassName}>
              <div className="flex h-full flex-col overflow-hidden bg-background sm:rounded-xl">
                <DialogHeader className="border-border/60 border-b px-4 py-4 sm:px-6">
                  <DialogTitle className="flex items-center gap-2">
                    {renderThumbnail()}
                    <span className="max-w-75 truncate">
                      {name ?? "Attachment"}
                    </span>
                    {fileSize && (
                      <span className="text-muted-foreground text-sm">
                        ({fileSize})
                      </span>
                    )}
                  </DialogTitle>
                </DialogHeader>
                <div className={cn("min-h-0 flex-1", isImagePreview ? "overflow-hidden" : "overflow-auto p-4 sm:p-6")}>
                  {renderModalContent()}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </TooltipProvider>
    );
  }

  if (variant === "tag") {
    return (
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="group relative inline-flex max-w-full"
        exit={{ opacity: 0, scale: 0.92 }}
        initial={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.18 }}
      >
        <Button
          aria-label={name ?? "Attachment"}
          className="flex h-6 min-w-0 max-w-[240px] items-center gap-1.5 rounded-md border border-border/80 bg-muted px-2 text-xs text-foreground hover:bg-muted/90"
          onClick={() => {
            setIsModalOpen(true);
            if (canPreview) {
              loadTextPreview().catch(() => undefined);
            }
          }}
          type="button"
          variant="ghost"
        >
          <File className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">{name ?? "Unnamed file"}</span>
        </Button>

        {onRemove && id ? (
          <Button
            className="-top-1 -right-1 absolute z-10 h-4 w-4 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(id);
            }}
            size="icon"
            type="button"
            variant="ghost"
          >
            <X className="h-2.5 w-2.5" />
          </Button>
        ) : null}

        <Dialog
          onOpenChange={(nextOpen) => {
            setIsModalOpen(nextOpen);
            if (!nextOpen) {
              setIsHovered(false);
            }
          }}
          open={isModalOpen}
        >
          <DialogContent className={attachmentPreviewDialogClassName}>
            <div className="flex h-full flex-col overflow-hidden bg-background sm:rounded-xl">
              <DialogHeader className="border-border/60 border-b px-4 py-4 sm:px-6">
                <DialogTitle className="flex items-center gap-2">
                  {renderThumbnail()}
                  <span className="max-w-75 truncate">
                    {name ?? "Attachment"}
                  </span>
                  {fileSize && (
                    <span className="text-muted-foreground text-sm">
                      ({fileSize})
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
                {renderModalContent()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    );
  }

  return (
    <TooltipProvider delay={280}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        className="group relative max-w-sm"
        exit={{ opacity: 0, scale: 0.8 }}
        initial={{ opacity: 0, scale: 0.8 }}
        transition={{ duration: 0.2 }}
      >
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={name ?? "Open attachment preview"}
                className={`rounded-full border border-border bg-secondary px-3 py-2 transition-colors hover:bg-muted ${
                  canPreview ? "cursor-pointer" : ""
                }`}
                onBlur={() => setIsHovered(false)}
                onClick={() => {
                  setIsModalOpen(true);
                  if (canPreview) {
                    loadTextPreview().catch(() => undefined);
                  }
                }}
                onFocus={() => setIsHovered(true)}
                onMouseEnter={() => {
                  setIsHovered(true);
                  loadTextPreview().catch(() => undefined);
                }}
                onMouseLeave={() => setIsHovered(false)}
                size="default"
                type="button"
                variant="ghost"
              />
            }
          >
            <div className="flex items-center gap-2.5">
              <div className="shrink-0">{renderPillIcon()}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground text-sm leading-none">
                  {name ?? "Unnamed file"}
                </p>
                {errorMessage && (
                  <p className="truncate text-destructive text-xs">
                    {errorMessage}
                  </p>
                )}
              </div>

              {onRemove && id && (
                <Button
                  className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onRemove(id);
                  }}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </TooltipTrigger>

          <TooltipContent className="p-2" side="top">
            {renderHoverPreview() || <p>Click to preview file</p>}
          </TooltipContent>
        </Tooltip>

        <Dialog
          onOpenChange={(nextOpen) => {
            setIsModalOpen(nextOpen);
            if (!nextOpen) {
              setIsHovered(false);
            }
          }}
          open={isModalOpen}
        >
          <DialogContent className={attachmentPreviewDialogClassName}>
            <div className="flex h-full flex-col overflow-hidden bg-background sm:rounded-xl">
              <DialogHeader className="border-border/60 border-b px-4 py-4 sm:px-6">
                <DialogTitle className="flex items-center gap-2">
                  {renderThumbnail()}
                  <span className="max-w-75 truncate">
                    {name ?? "Attachment"}
                  </span>
                  {fileSize && (
                    <span className="text-muted-foreground text-sm">
                      ({fileSize})
                    </span>
                  )}
                </DialogTitle>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
                {renderModalContent()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
}
