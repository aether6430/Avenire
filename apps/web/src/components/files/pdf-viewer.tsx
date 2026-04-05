"use client";

import {
  AnnotationLayer,
  CanvasLayer,
  Page,
  Pages,
  Root,
  Search,
  TextLayer,
  usePdfJump,
  usePdf,
  useSearch,
  ZoomIn,
  ZoomOut,
} from "@anaralabs/lector";
import { cn } from "@avenire/ui/lib/utils";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { Button } from "@avenire/ui/components/button";
import { motion } from "framer-motion";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import "pdfjs-dist/web/pdf_viewer.css";

function normalizePdfSearchText(value: string) {
  return value
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E]/g, " ")
    .trim()
    .toLowerCase();
}

function buildPdfHighlightQueries(
  highlightText?: string | null,
  fallbackHighlightText?: string | null
) {
  const candidates: string[] = [];
  const primary = normalizePdfSearchText(highlightText ?? "");
  const fallback = normalizePdfSearchText(fallbackHighlightText ?? "");

  if (primary.length > 0) {
    candidates.push(primary);
    if (primary.length > 180) {
      candidates.push(primary.slice(0, 180).trim());
    }
  }

  if (fallback.length > 0) {
    candidates.push(fallback);
  }

  return Array.from(new Set(candidates.filter((value) => value.length > 0)));
}

const PdfAutoJump = memo(function PdfAutoJump({
  fallbackHighlightText,
  highlightPage,
  highlightText,
}: {
  fallbackHighlightText?: string | null;
  highlightPage?: number | null;
  highlightText?: string | null;
}) {
  const { jumpToPage } = usePdfJump();
  const { search, textContent } = useSearch();

  useEffect(() => {
    const hasHighlightPage =
      typeof highlightPage === "number" && highlightPage > 0;
    const queries = buildPdfHighlightQueries(
      highlightText,
      fallbackHighlightText
    );

    if (hasHighlightPage) {
      jumpToPage(highlightPage, { align: "center", behavior: "smooth" });
      return;
    }

    if (queries.length === 0 || (textContent?.length ?? 0) === 0) {
      return;
    }

    for (const query of queries) {
      const resultSet = search(query, { limit: 20, threshold: 0.35 });
      const candidate =
        resultSet.exactMatches?.[0] ?? resultSet.fuzzyMatches?.[0] ?? null;
      if (!candidate) {
        continue;
      }

      jumpToPage(candidate.pageNumber, {
        align: "center",
        behavior: "smooth",
      });
      return;
    }
  }, [
    fallbackHighlightText,
    highlightPage,
    highlightText,
    jumpToPage,
    search,
    textContent,
  ]);

  return null;
});

function PdfFloatingDock() {
  const currentPage = usePdf((state) => state.currentPage);
  const totalPages = usePdf((state) => state.pdfDocumentProxy.numPages);
  const zoom = usePdf((state) => state.zoom);
  const updateZoom = usePdf((state) => state.updateZoom);
  const { jumpToPage } = usePdfJump();
  const viewportRef = usePdf((state) => state.viewportRef);
  const [pageInput, setPageInput] = useState("");
  const [zoomInput, setZoomInput] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const hideTimerRef = useRef<number | null>(null);

  const resolvedPage = useMemo(
    () => String(currentPage > 0 ? currentPage : 1),
    [currentPage]
  );
  const resolvedZoom = useMemo(
    () => String(Math.round((zoom || 1) * 100)),
    [zoom]
  );

  useEffect(() => {
    setPageInput("");
  }, [resolvedPage]);

  useEffect(() => {
    setZoomInput("");
  }, [resolvedZoom]);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node) {
      return;
    }

    const showDock = () => {
      setIsVisible(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 1200);
    };

    showDock();
    node.addEventListener("scroll", showDock, { passive: true });
    node.addEventListener("pointerenter", showDock);
    node.addEventListener("pointerleave", showDock);

    return () => {
      node.removeEventListener("scroll", showDock);
      node.removeEventListener("pointerenter", showDock);
      node.removeEventListener("pointerleave", showDock);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [viewportRef]);

  const commitPage = useCallback(() => {
    const raw = (pageInput || resolvedPage).trim();
    const nextPage = Number(raw);
    if (!Number.isFinite(nextPage) || nextPage < 1) {
      setPageInput("");
      return;
    }

    const clampedPage =
      totalPages > 0 ? Math.min(totalPages, nextPage) : nextPage;
    jumpToPage(clampedPage, { behavior: "smooth" });
    setPageInput("");
  }, [jumpToPage, pageInput, resolvedPage, totalPages]);

  const commitZoom = useCallback(() => {
    const raw = (zoomInput || resolvedZoom).trim();
    const nextZoom = Number(raw);
    if (!Number.isFinite(nextZoom) || nextZoom <= 0) {
      setZoomInput("");
      return;
    }

    updateZoom(Number((nextZoom / 100).toFixed(2)));
    setZoomInput("");
  }, [resolvedZoom, updateZoom, zoomInput]);

  return (
    <motion.div
      animate={{ opacity: isVisible ? 1 : 0, y: isVisible ? 0 : 10 }}
      className="pointer-events-none absolute inset-x-0 bottom-3 z-20 flex justify-center px-3"
      initial={false}
      transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border/70 bg-background/90 px-2 py-1.5 shadow-lg backdrop-blur-xl">
        <Button
          aria-label="Previous page"
          className="size-8 rounded-full"
          onClick={() =>
            jumpToPage(Math.max(1, currentPage - 1), { behavior: "smooth" })
          }
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowLeft className="size-3.5" />
        </Button>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-1">
          <input
            aria-label="Page number"
            className="w-11 bg-transparent text-center text-xs outline-none"
            inputMode="numeric"
            onBlur={commitPage}
            onChange={(event) => {
              setPageInput(event.target.value.replace(/\D+/g, ""));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitPage();
                event.currentTarget.blur();
              }
            }}
            pattern="[0-9]*"
            value={pageInput || resolvedPage}
          />
          <span className="text-muted-foreground">/</span>
          <span className="min-w-4 text-center text-muted-foreground">
            {totalPages || "-"}
          </span>
        </div>
        <Button
          aria-label="Next page"
          className="size-8 rounded-full"
          onClick={() =>
            totalPages > 0
              ? jumpToPage(Math.min(totalPages, currentPage + 1), {
                  behavior: "smooth",
                })
              : undefined
          }
          size="icon"
          type="button"
          variant="ghost"
        >
          <ArrowRight className="size-3.5" />
        </Button>

        <div className="mx-1 h-5 w-px bg-border/70" />

        <Button
          aria-label="Zoom out"
          className="size-8 rounded-full"
          onClick={() =>
            updateZoom((value) =>
              Math.max(0.1, Number((value - 0.1).toFixed(2)))
            )
          }
          size="icon"
          type="button"
          variant="ghost"
        >
          <ZoomOut className="size-3.5" />
        </Button>
        <div className="flex items-center gap-1 rounded-full border border-border/60 bg-background px-2 py-1">
          <input
            aria-label="Zoom percentage"
            className="w-12 bg-transparent text-center text-xs outline-none"
            inputMode="numeric"
            onBlur={commitZoom}
            onChange={(event) => {
              setZoomInput(event.target.value.replace(/\D+/g, ""));
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                commitZoom();
                event.currentTarget.blur();
              }
            }}
            pattern="[0-9]*"
            value={zoomInput || resolvedZoom}
          />
          <span className="text-muted-foreground">%</span>
        </div>
        <Button
          aria-label="Zoom in"
          className="size-8 rounded-full"
          onClick={() =>
            updateZoom((value) => Math.min(5, Number((value + 0.1).toFixed(2))))
          }
          size="icon"
          type="button"
          variant="ghost"
        >
          <ZoomIn className="size-3.5" />
        </Button>
      </div>
    </motion.div>
  );
}

function PDFViewer({
  source,
  fallbackHighlightText,
  highlightPage,
  highlightText,
  invertColors = true,
  className,
}: {
  source: string;
  fallbackHighlightText?: string | null;
  highlightPage?: number | null;
  highlightText?: string | null;
  invertColors?: boolean;
  className?: string;
}) {
  return (
    <Root
      className={cn(
        "relative flex h-[500px] w-full flex-col overflow-hidden rounded-lg border",
        className
      )}
      loader={<div className="p-4">Loading...</div>}
      source={source}
    >
      <PdfAutoJump
        fallbackHighlightText={fallbackHighlightText}
        highlightPage={highlightPage}
        highlightText={highlightText}
      />
      <Search>
        <Pages
          className={cn(
            "min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-4",
            invertColors &&
              "dark:invert-[94%] dark:hue-rotate-180 dark:brightness-[80%] dark:contrast-[228%]"
          )}
        >
          <Page>
            <CanvasLayer />
            <TextLayer />
            <AnnotationLayer />
          </Page>
        </Pages>
      </Search>
      <PdfFloatingDock />
    </Root>
  );
}

export default PDFViewer;
