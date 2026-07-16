"use client";

import { cn } from "@avenire/ui/lib/utils";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  type KeyboardEvent,
  memo,
  useId,
  useState,
  useSyncExternalStore,
} from "react";

export interface PreviewRailItem {
  id: string;
  label: string;
  level?: number;
}

export interface PreviewRailProps {
  activeId?: string | null;
  ariaLabel?: string;
  className?: string;
  items: PreviewRailItem[];
  onSelect: (id: string) => void;
}

const MARKER_SCALES = [1, 0.68, 0.44] as const;

function getMarkerScale(
  item: PreviewRailItem,
  itemIndex: number,
  focalIndex: number
) {
  const levelScale = Math.max(
    0.58,
    1 - Math.max(0, (item.level ?? 1) - 1) * 0.14
  );

  if (focalIndex < 0) {
    return 0.25 * levelScale;
  }

  const distance = Math.abs(itemIndex - focalIndex);
  return Math.max(0.25, (MARKER_SCALES[distance] ?? 0.25) * levelScale);
}

function focusRailItem(
  event: KeyboardEvent<HTMLButtonElement>,
  itemIndex: number,
  itemCount: number
) {
  let nextIndex: number | null = null;

  switch (event.key) {
    case "ArrowDown":
    case "ArrowRight":
      nextIndex = (itemIndex + 1) % itemCount;
      break;
    case "ArrowUp":
    case "ArrowLeft":
      nextIndex = (itemIndex - 1 + itemCount) % itemCount;
      break;
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = itemCount - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  const buttons = event.currentTarget
    .closest("nav")
    ?.querySelectorAll<HTMLButtonElement>("[data-preview-rail-item]");
  buttons?.item(nextIndex).focus();
}

function subscribeToHoverCapability(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const query = window.matchMedia("(hover: hover) and (pointer: fine)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getHoverCapabilitySnapshot() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches
  );
}

export const PreviewRail = memo(function PreviewRail({
  items,
  activeId,
  ariaLabel = "Table of contents",
  className,
  onSelect,
}: PreviewRailProps) {
  const uid = useId();
  const reduceMotion = useReducedMotion() ?? false;
  const canHover = useSyncExternalStore(
    subscribeToHoverCapability,
    getHoverCapabilitySnapshot,
    () => false
  );
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const displayedId = hoveredId ?? focusedId;
  const focalId = displayedId ?? activeId;
  const focalIndex = items.findIndex((item) => item.id === focalId);

  if (items.length === 0) {
    return null;
  }

  return (
    <aside
      className={cn("editor-toc-rail pointer-events-none", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocusedId(null);
        }
      }}
    >
      <div className="pointer-events-auto">
        <div className="editor-toc-rail__inner">
          <nav
            aria-label={ariaLabel}
            className="editor-toc-rail__panel"
            onPointerLeave={() => setHoveredId(null)}
          >
            <ol className="editor-toc-rail__list">
              {items.map((item, itemIndex) => {
                const isActive = item.id === activeId;
                const isDisplayed = item.id === displayedId;
                const labelOffset = Math.max(0, (item.level ?? 1) - 1) * 8;

                return (
                  <li key={item.id}>
                    <button
                      aria-current={isActive ? "location" : undefined}
                      aria-label={item.label}
                      className={cn(
                        "editor-toc-rail__item",
                        isActive && "is-active"
                      )}
                      data-preview-rail-item=""
                      onClick={() => onSelect(item.id)}
                      onFocus={(event) => {
                        if (event.currentTarget.matches(":focus-visible")) {
                          setFocusedId(item.id);
                        }
                      }}
                      onKeyDown={(event) =>
                        focusRailItem(event, itemIndex, items.length)
                      }
                      onPointerDown={() => setFocusedId(null)}
                      onPointerEnter={() => {
                        if (canHover) {
                          setHoveredId(item.id);
                        }
                      }}
                      type="button"
                    >
                      <motion.span
                        animate={{
                          scaleX: getMarkerScale(item, itemIndex, focalIndex),
                        }}
                        aria-hidden="true"
                        className="editor-toc-rail__tick"
                        transition={
                          reduceMotion
                            ? { duration: 0 }
                            : {
                                type: "spring",
                                bounce: 0.12,
                                duration: 0.24,
                              }
                        }
                      />
                      <AnimatePresence initial={false}>
                        {isDisplayed ? (
                          <motion.span
                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                            className="editor-toc-rail__label"
                            exit={
                              reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, x: 3, filter: "blur(3px)" }
                            }
                            initial={
                              reduceMotion
                                ? { opacity: 0 }
                                : { opacity: 0, x: 4, filter: "blur(4px)" }
                            }
                            key={`${uid}-${item.id}`}
                            style={{
                              right: `calc(100% + 0.55rem + ${labelOffset}px)`,
                            }}
                            transition={
                              reduceMotion
                                ? { duration: 0 }
                                : { duration: 0.16, ease: [0.23, 1, 0.32, 1] }
                            }
                          >
                            {item.label}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>
      </div>
    </aside>
  );
});
