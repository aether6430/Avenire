"use client";

import { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";

/* ─────────────────────────────────────────────
   VideoThumbnail
   Renders the first frame of a video file.
───────────────────────────────────────────── */
export function VideoThumbnail({
  src,
  mimeType,
  className,
  warm = false,
  openedCached = false,
}: {
  src: string;
  mimeType?: string | null;
  className?: string;
  warm?: boolean;
  openedCached?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (!warm && !openedCached) return;
    // Seek to first frame once metadata is ready.
    const onMeta = () => {
      video.currentTime = 0;
    };
    video.addEventListener("loadedmetadata", onMeta, { once: true });
    video.load();
    return () => video.removeEventListener("loadedmetadata", onMeta);
  }, [openedCached, warm]);

  if (failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-muted/70", className)}>
        <FileText className="size-8 text-violet-500" />
      </div>
    );
  }

  return (
    <video
      className={cn("h-full w-full object-cover", className)}
      muted
      onError={() => setFailed(true)}
      playsInline
      preload={warm || openedCached ? "metadata" : "none"}
      ref={videoRef}
    >
      <source src={src} type={mimeType ?? undefined} />
    </video>
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

    async function render() {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        // Set worker (same as the full viewer)
        pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.mjs",
          import.meta.url,
        ).toString();

        const pdf = await pdfjsLib.getDocument({ url: src, verbosity: 0 }).promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Render at 1.5× for a crisper thumbnail
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    }

    void render();
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (failed) {
    return (
      <div className={cn("flex h-full w-full items-center justify-center bg-muted/70", className)}>
        <FileText className="size-8 text-rose-500" />
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full overflow-hidden", className)}>
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/70">
          <FileText className="size-8 animate-pulse text-rose-400" />
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
