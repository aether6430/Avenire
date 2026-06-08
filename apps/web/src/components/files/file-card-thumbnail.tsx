"use client";

import {
  type MediaPlaybackSource,
  useMediaPlaybackSource,
} from "@avenire/ui/media";
import { FileCode as FileCode2, FileText } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  primeMediaPlayback,
  releaseMediaPlaybackPrime,
  resolveCachedPlaybackSource,
} from "@/lib/file-preview-cache";
import { cn } from "@/lib/utils";

type FileCardType =
  | "archive"
  | "audio"
  | "code"
  | "document"
  | "image"
  | "other"
  | "video";

interface FileCardProps {
  className?: string;
  details?: Array<{
    label: string;
    value: string;
  }>;
  fileType: FileCardType;
  lastUpdated: Date;
  matchMeta?: string;
  matchSnippet?: string;
  name: string;
  previewContent?: React.ReactNode;
  previewUrl?: string;
  variant?: "grid" | "row";
}

interface MarkdownThumbnailProps {
  className?: string;
  content?: string | null;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) {
    return "now";
  }
  if (diffMins < 60) {
    return `${diffMins}m`;
  }
  if (diffHours < 24) {
    return `${diffHours}h`;
  }
  if (diffDays < 7) {
    return `${diffDays}d`;
  }
  if (diffWeeks < 4) {
    return `${diffWeeks}w`;
  }
  if (diffMonths < 12) {
    return `${diffMonths}mo`;
  }
  return `${diffYears}y`;
}

const THUMBNAIL_SURFACE_CLASS =
  "relative flex h-full w-full items-center justify-center overflow-hidden rounded-md border border-border/60 bg-background";

function getFileIcon(fileType: FileCardType): React.ReactNode {
  if (fileType === "code") {
    return <FileCode2 aria-hidden="true" className="h-4 w-4" />;
  }

  const iconByType: Record<FileCardType, string> = {
    archive: "/icons/zip.svg",
    audio: "/icons/audio.svg",
    code: "/icons/_file.svg",
    document: "/icons/text.svg",
    image: "/icons/image.svg",
    other: "/icons/_file.svg",
    video: "/icons/video.svg",
  };

  return (
    <img
      alt=""
      aria-hidden="true"
      className="h-4 w-4"
      height={16}
      loading="lazy"
      src={iconByType[fileType]}
      width={16}
    />
  );
}

export function FileCard({
  className = "",
  details = [],
  fileType,
  lastUpdated,
  matchMeta,
  matchSnippet,
  name,
  previewContent,
  previewUrl,
  variant = "grid",
}: FileCardProps) {
  const [timeAgo, setTimeAgo] = useState(() => formatTimeAgo(lastUpdated));
  useEffect(() => {
    setTimeAgo(formatTimeAgo(lastUpdated));
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(lastUpdated));
    }, 60_000);
    return () => {
      clearInterval(interval);
    };
  }, [lastUpdated]);
  const hasPreview = Boolean(previewContent || previewUrl);
  let previewBody: React.ReactNode = null;

  if (previewContent) {
    previewBody = (
      <div className="h-full w-full overflow-hidden rounded-md [&_canvas]:h-full [&_canvas]:w-full [&_canvas]:rounded-md [&_img]:h-full [&_img]:w-full [&_img]:rounded-md [&_img]:object-contain [&_video]:h-full [&_video]:w-full [&_video]:rounded-md [&_video]:object-contain">
        {previewContent}
      </div>
    );
  } else if (previewUrl) {
    previewBody = (
      <div className="h-full w-full overflow-hidden rounded-md">
        <img
          alt={name}
          className="h-full w-full rounded-md object-contain transition-transform duration-300 group-hover:scale-[1.02]"
          height={168}
          src={previewUrl}
          width={224}
        />
      </div>
    );
  } else {
    previewBody = (
      <div className="flex h-full w-full flex-col items-center justify-center text-neutral-400 transition-colors group-hover:text-neutral-300">
        <div className="h-8 w-8 opacity-60">{getFileIcon(fileType)}</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        variant === "row"
          ? "grid w-full max-w-full grid-cols-[7.5rem_minmax(0,1fr)] items-stretch gap-3 overflow-hidden"
          : "inline-flex w-full max-w-full flex-col items-center gap-2 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "group relative flex w-full min-w-0 items-center justify-center overflow-hidden rounded-md border border-border/60 bg-muted/70",
          variant === "row"
            ? "h-full min-h-24"
            : hasPreview
              ? "h-28"
              : "aspect-[4/3] h-28"
        )}
      >
        {previewBody}
        {hasPreview ? (
          <div className="pointer-events-none absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <div className="flex w-full min-w-0 max-w-full items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="shrink-0 text-muted-foreground">
              {getFileIcon(fileType)}
            </span>
            <span
              className="min-w-0 flex-1 truncate font-medium text-sm"
              title={name}
            >
              {name}
            </span>
          </div>
          <span className="shrink-0 text-muted-foreground text-xs tabular-nums">
            {timeAgo}
          </span>
        </div>
        {matchSnippet ? (
          <div className="min-w-0">
            {matchMeta ? (
              <p className="mb-1 truncate text-[10px] text-muted-foreground">
                {matchMeta}
              </p>
            ) : null}
            <p className="line-clamp-3 text-muted-foreground text-xs leading-5">
              {matchSnippet}
            </p>
          </div>
        ) : null}
        {details.length > 0 ? (
          <div className="flex w-full min-w-0 flex-wrap gap-1.5">
            {details.map((detail) => (
              <span
                className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-background/75 px-2 py-0.5 text-[10px] text-muted-foreground leading-none"
                key={`${detail.label}:${detail.value}`}
                title={`${detail.label}: ${detail.value}`}
              >
                <span className="shrink-0 font-medium text-foreground/75">
                  {detail.label}
                </span>
                <span className="min-w-0 max-w-24 truncate">
                  {detail.value}
                </span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function MarkdownThumbnail({
  className,
  content,
}: MarkdownThumbnailProps) {
  const markdownContent = typeof content === "string" ? content.trim() : "";
  const previewLines = markdownContent
    .split("\n")
    .map((line) => line.replace(/^#{1,6}\s+/, "").trim())
    .filter(Boolean)
    .slice(0, 5);

  return (
    <div
      className={cn(
        THUMBNAIL_SURFACE_CLASS,
        "pointer-events-none select-none bg-[#151515] p-1.5",
        className
      )}
      aria-hidden="true"
    >
      {markdownContent ? (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-[5px] border border-white/8 bg-[#191919]">
          <div className="flex h-6 shrink-0 items-center gap-1.5 border-white/8 border-b px-2">
            <FileText className="size-3 text-muted-foreground/70" />
            <div className="h-1.5 w-16 rounded-sm bg-muted-foreground/25" />
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5 px-2.5 py-2">
            {(previewLines.length > 0 ? previewLines : ["Untitled note"]).map(
              (line, index) => (
                <div
                  className="flex h-2.5 min-w-0 items-center"
                  key={`${line}-${index}`}
                >
                  <div
                    className={cn(
                      "h-1 rounded-sm bg-muted-foreground/25",
                      index === 0 && "h-1.5 bg-muted-foreground/40",
                      index === 0 && line.length > 24 && "w-11/12",
                      index === 0 && line.length <= 24 && "w-8/12",
                      index === 1 && "w-10/12",
                      index === 2 && "w-7/12",
                      index === 3 && "w-9/12",
                      index >= 4 && "w-6/12"
                    )}
                  />
                </div>
              )
            )}
          </div>
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-[5px] bg-muted/30 text-muted-foreground">
          <FileCode2 aria-hidden="true" className="size-4" />
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   VideoThumbnail
   Renders the first frame of a video file.
───────────────────────────────────────────── */
export function VideoThumbnail({
  playbackSource,
  posterUrl,
  className,
  warm = false,
  openedCached = false,
  playOnHover = false,
  sizeBytes,
}: {
  playbackSource: MediaPlaybackSource;
  posterUrl?: string | null;
  className?: string;
  warm?: boolean;
  openedCached?: boolean;
  playOnHover?: boolean;
  sizeBytes?: number;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [resolvedPlaybackSource, setResolvedPlaybackSource] = useState(() =>
    resolveCachedPlaybackSource(playbackSource)
  );
  const [failed, setFailed] = useState(false);

  useMediaPlaybackSource({
    mediaRef: videoRef,
    onError: () => setFailed(true),
    playbackSource: resolvedPlaybackSource,
  });

  useEffect(() => {
    setFailed(false);
    setResolvedPlaybackSource(resolveCachedPlaybackSource(playbackSource));
  }, [playbackSource]);

  useEffect(() => {
    if (!(warm || openedCached || playOnHover)) {
      return;
    }

    primeMediaPlayback(playbackSource, {
      mediaType: "video",
      posterUrl,
      sizeBytes,
      surface: "thumbnail",
    })
      .then(() => {
        setResolvedPlaybackSource(resolveCachedPlaybackSource(playbackSource));
      })
      .catch(() => {
        // Ignore warmup failures for thumbnails.
      });

    return () => {
      releaseMediaPlaybackPrime(playbackSource);
    };
  }, [openedCached, playOnHover, playbackSource, posterUrl, sizeBytes, warm]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    if (!(warm || openedCached)) {
      return;
    }
    // Seek to first frame once metadata is ready.
    const onMeta = () => {
      video.currentTime = 0;
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.load();
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [openedCached, warm]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (!playOnHover) {
      video.pause();
      video.currentTime = 0;
      return;
    }

    const startPlayback = async () => {
      try {
        video.loop = true;
        await video.play();
      } catch {
        // Ignore autoplay failures for previews.
      }
    };

    startPlayback().catch(() => {
      // Ignore playback bootstrap failures for thumbnails.
    });

    return () => {
      video.pause();
      video.currentTime = 0;
    };
  }, [playOnHover]);

  if (failed) {
    return (
      <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
        <FileText className="size-8 text-violet-500" />
      </div>
    );
  }

  return (
    <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
      <video
        className="h-full w-full object-contain"
        muted
        onError={() => setFailed(true)}
        playsInline
        poster={posterUrl ?? undefined}
        preload={warm || openedCached || playOnHover ? "auto" : "none"}
        ref={videoRef}
      />
    </div>
  );
}

/* ─────────────────────────────────────────────
   PdfThumbnail
   Renders the first page of a PDF onto a canvas.
───────────────────────────────────────────── */
export function PdfThumbnail({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPdfPage() {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.mjs",
        import.meta.url
      ).toString();

      const pdf = await pdfjsLib.getDocument({ url: src, verbosity: 0 })
        .promise;
      if (cancelled) {
        return null;
      }

      const page = await pdf.getPage(1);
      if (cancelled) {
        return null;
      }

      return page;
    }

    async function render() {
      try {
        const page = await loadPdfPage();
        if (!page) {
          return;
        }

        const canvas = canvasRef.current;
        if (!canvas) {
          return;
        }

        // Render at 1.5× for a crisper thumbnail
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return;
        }

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) {
          setReady(true);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    }

    render().catch(() => {
      if (!cancelled) {
        setFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
        <FileText className="size-8 text-rose-500" />
      </div>
    );
  }

  return (
    <div className={cn(THUMBNAIL_SURFACE_CLASS, className)}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/70">
          <FileText className="size-8 text-rose-400" />
        </div>
      )}
      <canvas
        className="h-full w-full object-contain"
        ref={canvasRef}
        style={{ opacity: ready ? 1 : 0, transition: "opacity 0.2s" }}
      />
    </div>
  );
}
