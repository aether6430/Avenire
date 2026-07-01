"use client";

import { Button } from "@avenire/ui/components/button";
import { cn } from "@avenire/ui/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CaretDown,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
} from "@phosphor-icons/react";
import { m } from "framer-motion";
import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export function useScrollActivatedDock(
  viewportRef: RefObject<HTMLElement | null>,
  active = true
) {
  const [isVisible, setIsVisible] = useState(active);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const node = viewportRef.current;
    if (!node || !active) {
      setIsVisible(false);
      return;
    }

    setIsVisible(true);

    const showDock = () => {
      setIsVisible(true);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
      hideTimerRef.current = window.setTimeout(() => {
        setIsVisible(false);
      }, 1000);
    };

    node.addEventListener("scroll", showDock, { passive: true });

    return () => {
      node.removeEventListener("scroll", showDock);
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }
    };
  }, [active, viewportRef]);

  return isVisible;
}

export function DocumentViewerDock({
  className,
  currentPage,
  isVisible,
  maxZoom = 5,
  minZoom = 0.1,
  onNextPage,
  onPageChange,
  onPreviousPage,
  onZoomChange,
  pageLabel = "Page number",
  totalPages,
  zoom,
}: {
  className?: string;
  currentPage: number;
  isVisible: boolean;
  maxZoom?: number;
  minZoom?: number;
  onNextPage?: () => void;
  onPageChange?: (page: number) => void;
  onPreviousPage?: () => void;
  onZoomChange: (zoom: number) => void;
  pageLabel?: string;
  totalPages?: number | null;
  zoom: number;
}) {
  const [pageInput, setPageInput] = useState("");
  const [zoomInput, setZoomInput] = useState("");
  const [isPointerActive, setIsPointerActive] = useState(false);
  const pointerHideTimerRef = useRef<number | null>(null);
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

  useEffect(
    () => () => {
      if (pointerHideTimerRef.current) {
        window.clearTimeout(pointerHideTimerRef.current);
      }
    },
    []
  );

  const showFromPointer = useCallback(() => {
    setIsPointerActive(true);
    if (pointerHideTimerRef.current) {
      window.clearTimeout(pointerHideTimerRef.current);
    }
  }, []);

  const hideAfterPointerLeave = useCallback(() => {
    if (pointerHideTimerRef.current) {
      window.clearTimeout(pointerHideTimerRef.current);
    }
    pointerHideTimerRef.current = window.setTimeout(() => {
      setIsPointerActive(false);
    }, 1000);
  }, []);

  const commitPage = useCallback(() => {
    if (!onPageChange) {
      setPageInput("");
      return;
    }
    const raw = (pageInput || resolvedPage).trim();
    const nextPage = Number(raw);
    if (!Number.isFinite(nextPage) || nextPage < 1) {
      setPageInput("");
      return;
    }

    const clampedPage = totalPages
      ? Math.min(totalPages, Math.round(nextPage))
      : Math.round(nextPage);
    onPageChange(clampedPage);
    setPageInput("");
  }, [onPageChange, pageInput, resolvedPage, totalPages]);

  const commitZoom = useCallback(() => {
    const raw = (zoomInput || resolvedZoom).trim();
    const nextZoom = Number(raw);
    if (!Number.isFinite(nextZoom) || nextZoom <= 0) {
      setZoomInput("");
      return;
    }

    onZoomChange(
      Math.min(maxZoom, Math.max(minZoom, Number((nextZoom / 100).toFixed(2))))
    );
    setZoomInput("");
  }, [maxZoom, minZoom, onZoomChange, resolvedZoom, zoomInput]);

  const isEditing = pageInput.length > 0 || zoomInput.length > 0;
  const shouldShowDock = isVisible || isPointerActive || isEditing;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-4",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-auto absolute inset-x-0 bottom-0 h-24"
        onPointerEnter={showFromPointer}
        onPointerLeave={hideAfterPointerLeave}
      />
      <m.div
        animate={{ opacity: shouldShowDock ? 1 : 0, y: shouldShowDock ? 0 : 8 }}
        className="pointer-events-none relative z-10"
        initial={false}
        transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
      >
        <div
          className="pointer-events-auto flex h-12 items-center gap-3 rounded-full border border-white/10 bg-[#303236] px-4 text-[#f3f4f6] text-sm shadow-[0_8px_24px_rgba(0,0,0,0.22)]"
          onBlurCapture={hideAfterPointerLeave}
          onFocusCapture={showFromPointer}
          onPointerEnter={showFromPointer}
          onPointerLeave={hideAfterPointerLeave}
        >
          {onPageChange ? (
            <div className="flex items-center gap-2">
              <span className="font-medium text-[#d6d9de] text-sm">Page</span>
              <input
                aria-label={pageLabel}
                className="h-6 w-6 rounded-md border border-[#777d86] bg-transparent text-center font-medium text-[#f8fafc] text-sm outline-none focus:border-[#d7dbe1]"
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
              <span className="text-[#d6d9de]">/</span>
              <span className="min-w-3 text-center font-medium text-[#f8fafc] text-sm">
                {totalPages || "-"}
              </span>
            </div>
          ) : null}

          {(onPreviousPage || onNextPage) && onPageChange ? (
            <div className="h-6 w-px bg-white/10" />
          ) : null}

          {onPreviousPage ? (
            <Button
              aria-label="Previous page"
              className="size-7 rounded-full p-0 text-[#d6d9de] hover:bg-white/8 hover:text-white"
              disabled={currentPage <= 1}
              onClick={onPreviousPage}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowLeft className="size-4" />
            </Button>
          ) : null}
          {onNextPage ? (
            <Button
              aria-label="Next page"
              className="size-7 rounded-full p-0 text-[#d6d9de] hover:bg-white/8 hover:text-white"
              disabled={Boolean(totalPages) && currentPage >= Number(totalPages)}
              onClick={onNextPage}
              size="icon"
              type="button"
              variant="ghost"
            >
              <ArrowRight className="size-4" />
            </Button>
          ) : null}

          <div className="h-6 w-px bg-white/10" />

          <Button
            aria-label="Zoom out"
            className="size-7 rounded-full p-0 text-[#d6d9de] hover:bg-white/8 hover:text-white"
            onClick={() =>
              onZoomChange(Math.max(minZoom, Number((zoom - 0.1).toFixed(2))))
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <MagnifyingGlassMinus className="size-4" />
          </Button>
          <div className="flex items-center gap-1.5">
            <input
              aria-label="Zoom percentage"
              className="h-7 w-11 bg-transparent text-center font-medium text-[#f8fafc] text-sm outline-none"
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
            <span className="font-medium text-[#f8fafc] text-sm">%</span>
            <CaretDown className="size-3 text-[#b8bec7]" weight="bold" />
          </div>
          <Button
            aria-label="Zoom in"
            className="size-7 rounded-full p-0 text-[#d6d9de] hover:bg-white/8 hover:text-white"
            onClick={() =>
              onZoomChange(Math.min(maxZoom, Number((zoom + 0.1).toFixed(2))))
            }
            size="icon"
            type="button"
            variant="ghost"
          >
            <MagnifyingGlassPlus className="size-4" />
          </Button>
        </div>
      </m.div>
    </div>
  );
}
