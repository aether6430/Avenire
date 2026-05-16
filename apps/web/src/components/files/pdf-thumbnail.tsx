"use client";

import { cn } from "@avenire/ui/lib/utils";
import { FileText } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { THUMBNAIL_SURFACE_CLASS } from "./file-card-thumbnail-shared";

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
