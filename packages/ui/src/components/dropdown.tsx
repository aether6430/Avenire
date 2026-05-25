"use client";

import { AnimatePresence, m } from "motion/react";
import {
  createContext,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useProximityHover } from "../hooks/use-proximity-hover";
import { useShape } from "../lib/shape-context";
import { springs } from "../lib/springs";
import { cn } from "../lib/utils";

interface DropdownContextValue {
  activeIndex: number | null;
  checkedIndex?: number;
  registerItem: (index: number, element: HTMLElement | null) => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) {
    throw new Error("useDropdown must be used within a Dropdown");
  }
  return ctx;
}

interface DropdownProps extends HTMLAttributes<HTMLDivElement> {
  checkedIndex?: number;
  children: ReactNode;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(
  ({ children, checkedIndex, className, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const {
      activeIndex,
      setActiveIndex,
      itemRects,
      sessionRef,
      handlers,
      registerItem,
      measureItems,
    } = useProximityHover(containerRef);

    useEffect(() => {
      measureItems();
    }, [measureItems]);

    const [focusedIndex, setFocusedIndex] = useState<number | null>(null);

    const activeRect = activeIndex !== null ? itemRects[activeIndex] : null;
    const checkedRect = checkedIndex != null ? itemRects[checkedIndex] : null;
    const focusRect = focusedIndex !== null ? itemRects[focusedIndex] : null;
    const isHoveringOther =
      activeIndex !== null && activeIndex !== checkedIndex;
    const shape = useShape();

    return (
      <DropdownContext.Provider
        value={{ registerItem, activeIndex, checkedIndex }}
      >
        <div
          className={cn(
            `relative flex w-72 max-w-full flex-col gap-0.5 ${shape.container} select-none border border-border/60 bg-card p-1 shadow-[0_4px_12px_rgba(0,0,0,0.02)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]`,
            className
          )}
          onBlur={(e) => {
            if (containerRef.current?.contains(e.relatedTarget as Node)) {
              return;
            }
            setFocusedIndex(null);
            setActiveIndex(null);
          }}
          onFocus={(e) => {
            const indexAttr = (e.target as HTMLElement)
              .closest("[data-proximity-index]")
              ?.getAttribute("data-proximity-index");
            if (indexAttr != null) {
              const idx = Number(indexAttr);
              setActiveIndex(idx);
              setFocusedIndex(
                (e.target as HTMLElement).matches(":focus-visible") ? idx : null
              );
            }
          }}
          onKeyDown={(e) => {
            const items = Array.from(
              containerRef.current?.querySelectorAll(
                '[role="menuitemradio"]'
              ) ?? []
            ) as HTMLElement[];
            const currentIdx = items.indexOf(e.target as HTMLElement);
            if (currentIdx === -1) {
              return;
            }

            if (
              ["ArrowDown", "ArrowUp", "ArrowRight", "ArrowLeft"].includes(
                e.key
              )
            ) {
              e.preventDefault();
              const next = ["ArrowDown", "ArrowRight"].includes(e.key)
                ? (currentIdx + 1) % items.length
                : (currentIdx - 1 + items.length) % items.length;
              items[next].focus();
            } else if (e.key === "Home") {
              e.preventDefault();
              items[0]?.focus();
            } else if (e.key === "End") {
              e.preventDefault();
              items.at(-1)?.focus();
            }
          }}
          onMouseEnter={handlers.onMouseEnter}
          onMouseLeave={handlers.onMouseLeave}
          onMouseMove={handlers.onMouseMove}
          ref={(node) => {
            (
              containerRef as React.MutableRefObject<HTMLDivElement | null>
            ).current = node;
            if (typeof ref === "function") {
              ref(node);
            } else if (ref) {
              (ref as React.MutableRefObject<HTMLDivElement | null>).current =
                node;
            }
          }}
          role="menu"
          {...props}
        >
          <AnimatePresence>
            {checkedRect && (
              <m.div
                animate={{
                  top: checkedRect.top,
                  left: checkedRect.left,
                  width: checkedRect.width,
                  height: checkedRect.height,
                  opacity: isHoveringOther ? 0.8 : 1,
                }}
                className={`absolute ${shape.bg} pointer-events-none bg-selected/50 dark:bg-accent/40`}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
                initial={false}
                transition={{
                  ...springs.moderate,
                  opacity: { duration: 0.08 },
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {activeRect && (
              <m.div
                animate={{
                  opacity: 1,
                  top: activeRect.top,
                  left: activeRect.left,
                  width: activeRect.width,
                  height: activeRect.height,
                }}
                className={`absolute ${shape.bg} pointer-events-none bg-accent/40 dark:bg-accent/25`}
                exit={{ opacity: 0, transition: { duration: 0.06 } }}
                initial={{
                  opacity: 0,
                  top: checkedRect?.top ?? activeRect.top,
                  left: checkedRect?.left ?? activeRect.left,
                  width: checkedRect?.width ?? activeRect.width,
                  height: checkedRect?.height ?? activeRect.height,
                }}
                key={sessionRef.current}
                transition={{
                  ...springs.fast,
                  opacity: { duration: 0.08 },
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {focusRect && (
              <m.div
                animate={{
                  left: focusRect.left - 2,
                  top: focusRect.top - 2,
                  width: focusRect.width + 4,
                  height: focusRect.height + 4,
                }}
                className={`absolute ${shape.focusRing} pointer-events-none z-20 border border-[#6B97FF]`}
                exit={{ opacity: 0, transition: { duration: 0.06 } }}
                initial={false}
                transition={{
                  ...springs.fast,
                  opacity: { duration: 0.08 },
                }}
              />
            )}
          </AnimatePresence>

          {children}
        </div>
      </DropdownContext.Provider>
    );
  }
);

Dropdown.displayName = "Dropdown";

const DropdownLabel = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("px-2 py-1.5 text-[11px] text-muted-foreground", className)}
    ref={ref}
    {...props}
  />
));

DropdownLabel.displayName = "DropdownLabel";

const DropdownSeparator = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn("-mx-1 my-1 h-px bg-border/60", className)}
    ref={ref}
    role="separator"
    {...props}
  />
));

DropdownSeparator.displayName = "DropdownSeparator";

export { Dropdown, DropdownLabel, DropdownSeparator };
export default Dropdown;
