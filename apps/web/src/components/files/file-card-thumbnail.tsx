"use client";

import {
  type MediaPlaybackSource,
  useMediaPlaybackSource,
} from "@avenire/ui/media";
import { FileCode2, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Markdown } from "@/components/chat/markdown";
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
  name: string;
  previewContent?: React.ReactNode;
  previewUrl?: string;
}

interface MarkdownThumbnailProps {
  className?: string;
  content?: string | null;
  id?: string;
  workspaceUuid?: string;
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
  name,
  previewContent,
  previewUrl,
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
      <div className="h-full w-auto max-w-full overflow-hidden rounded-lg border border-border/50 bg-card/60 p-1 [&_canvas]:h-full [&_canvas]:w-auto [&_canvas]:rounded-md [&_img]:h-full [&_img]:w-auto [&_img]:rounded-md [&_img]:object-contain [&_video]:h-full [&_video]:w-auto [&_video]:rounded-md [&_video]:object-contain">
        {previewContent}
      </div>
    );
  } else if (previewUrl) {
    previewBody = (
      <div className="h-full w-auto max-w-full overflow-hidden rounded-lg border border-border/50 bg-card/60 p-1">
        <img
          alt={name}
          className="h-full w-auto max-w-full rounded-md object-contain transition-transform duration-300 group-hover:scale-[1.02]"
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
        "inline-flex w-full max-w-full flex-col items-center gap-2 overflow-hidden",
        className
      )}
    >
      <div
        className={cn(
          "group relative flex w-full min-w-0 items-center justify-center overflow-hidden rounded-xl border border-border/45 bg-muted/70 p-1.5",
          hasPreview ? "h-28" : "aspect-[4/3] h-28"
        )}
      >
        {previewBody}
        {hasPreview ? (
          <div className="pointer-events-none absolute inset-0 bg-black opacity-0 transition-opacity duration-300 group-hover:opacity-10" />
        ) : null}
      </div>
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
      {details.length > 0 ? (
        <div className="flex w-full min-w-0 flex-wrap gap-1.5">
          {details.map((detail) => (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/50 bg-background/75 px-2 py-0.5 text-[10px] text-muted-foreground leading-none"
              key={`${detail.label}:${detail.value}`}
              title={`${detail.label}: ${detail.value}`}
            >
              <span className="shrink-0 font-medium text-foreground/75">
                {detail.label}
              </span>
              <span className="min-w-0 truncate">{detail.value}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function MarkdownThumbnail({
  className,
  content,
  id,
  workspaceUuid,
}: MarkdownThumbnailProps) {
  const markdownIdRef = useRef(
    `markdown-thumbnail-${crypto.randomUUID()}`
  );

  const markdownContent =
    typeof content === "string" && content.trim().length > 0
      ? content
      : null;

  return (
    <div
      className={cn(
        "flex h-full w-full items-start justify-start overflow-hidden rounded-md border border-border/50 bg-background p-2 text-[8px] leading-none",
        className
      )}
    >
      {markdownContent ? (
        <div className="origin-top-left scale-[0.62] transform-gpu">
          <Markdown
            className="max-w-none break-words text-foreground [&_p]:my-0 [&_h1]:mt-0 [&_h1]:mb-0 [&_h2]:mt-0 [&_h2]:mb-0 [&_h3]:mt-0 [&_h3]:mb-0 [&_h4]:mt-0 [&_h4]:mb-0 [&_h5]:mt-0 [&_h5]:mb-0 [&_h6]:mt-0 [&_h6]:mb-0 [&_li]:py-0 [&_ol]:my-0 [&_ul]:my-0 [&_pre]:my-0"
            content={markdownContent}
            id={id ?? markdownIdRef.current}
            parseIncompleteMarkdown={false}
            textSize="small"
            workspaceUuid={workspaceUuid}
          />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-md border border-dashed border-border/60 bg-muted/30 text-muted-foreground">
          <FileCode2 className="size-4" aria-hidden="true" />
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
  }, [playOnHover, resolvedPlaybackSource]);

  if (failed) {
    return (
      <div
        className={cn(
          "flex h-full w-auto items-center justify-center bg-muted/70",
          className
        )}
      >
        <FileText className="size-8 text-violet-500" />
      </div>
    );
  }

  return (
    <video
      className={cn("h-full w-auto object-contain", className)}
      muted
      onError={() => setFailed(true)}
      playsInline
      poster={posterUrl ?? undefined}
      preload={warm || openedCached || playOnHover ? "auto" : "none"}
      ref={videoRef}
    />
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
      <div
        className={cn(
          "flex h-full w-auto items-center justify-center bg-muted/70",
          className
        )}
      >
        <FileText className="size-8 text-rose-500" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-auto overflow-hidden", className)}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/70">
          <FileText className="size-8 text-rose-400" />
        </div>
      )}
      <canvas
        className="h-full w-auto object-contain"
        ref={canvasRef}
        style={{ opacity: ready ? 1 : 0, transition: "opacity 0.2s" }}
      />
    </div>
  );
}
