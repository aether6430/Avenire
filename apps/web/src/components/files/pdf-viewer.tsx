"use client";

import {
  AnnotationLayer,
  CanvasLayer,
  Page,
  Pages,
  Root,
  Search,
  TextLayer,
  usePdf,
  usePdfJump,
  useSearch,
} from "@anaralabs/lector";
import { cn } from "@avenire/ui/lib/utils";
import { GlobalWorkerOptions } from "pdfjs-dist";
import { memo, useEffect } from "react";
import {
  DocumentViewerDock,
  useScrollActivatedDock,
} from "@/components/files/document-viewer-dock";
import "pdfjs-dist/web/pdf_viewer.css";

if (!GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.mjs",
    import.meta.url
  ).toString();
}

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
  highlightText,
}: {
  fallbackHighlightText?: string | null;
  highlightText?: string | null;
}) {
  const { jumpToPage } = usePdfJump();
  const { search, textContent } = useSearch();

  useEffect(() => {
    const queries = buildPdfHighlightQueries(
      highlightText,
      fallbackHighlightText
    );

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
  }, [fallbackHighlightText, highlightText, jumpToPage, search, textContent]);

  return null;
});

const PdfPageJump = memo(function PdfPageJump({
  highlightPage,
}: {
  highlightPage?: number | null;
}) {
  const { jumpToPage } = usePdfJump();

  useEffect(() => {
    if (typeof highlightPage === "number" && highlightPage > 0) {
      jumpToPage(highlightPage, { align: "center", behavior: "smooth" });
    }
  }, [highlightPage, jumpToPage]);

  return null;
});

function PdfPagesView({
  invertColors,
  withTextLayer,
}: {
  invertColors: boolean;
  withTextLayer: boolean;
}) {
  return (
    <Pages
      className={cn(
        "min-h-0 flex-1 overflow-auto px-3 py-3 sm:px-4 sm:py-4",
        invertColors &&
          "dark:brightness-[80%] dark:contrast-[228%] dark:hue-rotate-180 dark:invert-[94%]"
      )}
    >
      <Page>
        <CanvasLayer />
        {withTextLayer ? <TextLayer /> : null}
        <AnnotationLayer />
      </Page>
    </Pages>
  );
}

function PdfFloatingDock() {
  const currentPage = usePdf((state) => state.currentPage);
  const pdfDocumentProxy = usePdf((state) => state.pdfDocumentProxy);
  const totalPages = pdfDocumentProxy?.numPages ?? 0;
  const zoom = usePdf((state) => state.zoom);
  const updateZoom = usePdf((state) => state.updateZoom);
  const { jumpToPage } = usePdfJump();
  const viewportRef = usePdf((state) => state.viewportRef);
  const hasDocument = Boolean(pdfDocumentProxy);
  const isScrollVisible = useScrollActivatedDock(viewportRef, hasDocument);
  const isVisible = isScrollVisible;

  return (
    <DocumentViewerDock
      currentPage={currentPage}
      isVisible={isVisible}
      onNextPage={() => {
        if (hasDocument && totalPages > 0) {
          jumpToPage(Math.min(totalPages, currentPage + 1), {
            behavior: "smooth",
          });
        }
      }}
      onPageChange={(page) => {
        if (hasDocument) {
          jumpToPage(page, { behavior: "smooth" });
        }
      }}
      onPreviousPage={() => {
        if (hasDocument) {
          jumpToPage(Math.max(1, currentPage - 1), { behavior: "smooth" });
        }
      }}
      onZoomChange={(nextZoom) => updateZoom(nextZoom)}
      totalPages={totalPages}
      zoom={zoom || 1}
    />
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
  const hasPageJump = typeof highlightPage === "number" && highlightPage > 0;
  const hasSearchJump =
    !hasPageJump &&
    buildPdfHighlightQueries(highlightText, fallbackHighlightText).length > 0;

  return (
    <Root
      className={cn(
        "relative flex h-[500px] w-full flex-col overflow-hidden border-0 bg-background",
        className
      )}
      loader={<div className="p-4">Loading...</div>}
      source={source}
    >
      {hasPageJump ? <PdfPageJump highlightPage={highlightPage} /> : null}
      {hasSearchJump ? (
        <Search>
          <PdfAutoJump
            fallbackHighlightText={fallbackHighlightText}
            highlightText={highlightText}
          />
          <PdfPagesView invertColors={invertColors} withTextLayer />
        </Search>
      ) : (
        <PdfPagesView invertColors={invertColors} withTextLayer={false} />
      )}
      <PdfFloatingDock />
    </Root>
  );
}

export default PDFViewer;
