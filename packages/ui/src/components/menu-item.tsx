"use client";

import { AnimatePresence, m } from "motion/react";
import { forwardRef, type HTMLAttributes, useEffect, useRef } from "react";
import { fontWeights } from "../lib/font-weight";
import type { IconComponent } from "../lib/icon-context";
import { useShape } from "../lib/shape-context";
import { cn } from "../lib/utils";
import { useDropdown } from "./dropdown";

interface MenuItemProps extends HTMLAttributes<HTMLDivElement> {
  checked?: boolean;
  icon: IconComponent;
  index: number;
  label: string;
  onSelect?: () => void;
}

const MenuItem = forwardRef<HTMLDivElement, MenuItemProps>(
  (
    { icon: Icon, label, index, checked, onSelect, className, ...props },
    ref
  ) => {
    const internalRef = useRef<HTMLDivElement>(null);
    const hasMounted = useRef(false);
    const { registerItem, activeIndex, checkedIndex } = useDropdown();

    useEffect(() => {
      registerItem(index, internalRef.current);
      return () => registerItem(index, null);
    }, [index, registerItem]);

    useEffect(() => {
      hasMounted.current = true;
    }, []);

    const isActive = activeIndex === index;
    const skipAnimation = !hasMounted.current;
    const shape = useShape();

    return (
      <div
        aria-checked={!!checked}
        aria-label={label}
        className={cn(
          `relative z-10 flex items-center gap-2 ${shape.item} cursor-pointer px-2 py-2 outline-none`,
          className
        )}
        data-proximity-index={index}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onSelect?.();
          }
        }}
        ref={(node) => {
          (
            internalRef as React.MutableRefObject<HTMLDivElement | null>
          ).current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            (ref as React.MutableRefObject<HTMLDivElement | null>).current =
              node;
          }
        }}
        role="menuitemradio"
        tabIndex={index === (checkedIndex ?? 0) ? 0 : -1}
        {...props}
      >
        <span className="inline-grid">
          <span className="invisible col-start-1 row-start-1">
            <Icon size={16} strokeWidth={2} />
          </span>
          <Icon
            className={cn(
              "col-start-1 row-start-1 transition-[color,stroke-width] duration-80",
              isActive || checked ? "text-foreground" : "text-muted-foreground"
            )}
            size={16}
            strokeWidth={isActive || checked ? 2 : 1.5}
          />
        </span>
        <span className="inline-grid flex-1 text-[13px]">
          <span
            aria-hidden="true"
            className="invisible col-start-1 row-start-1"
            style={{ fontVariationSettings: fontWeights.semibold }}
          >
            {label}
          </span>
          <span
            className={cn(
              "col-start-1 row-start-1 transition-[color,font-variation-settings] duration-80",
              isActive || checked ? "text-foreground" : "text-muted-foreground"
            )}
            style={{
              fontVariationSettings: checked
                ? fontWeights.semibold
                : fontWeights.normal,
            }}
          >
            {label}
          </span>
        </span>
        <AnimatePresence>
          {checked && (
            <m.svg
              animate={{ opacity: 1 }}
              className="shrink-0 text-foreground"
              exit={{ opacity: 1 }}
              fill="none"
              height={16}
              initial={{ opacity: 1 }}
              key="check"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              viewBox="0 0 24 24"
              width={16}
            >
              <m.path
                animate={{
                  pathLength: 1,
                  transition: { duration: 0.08, ease: "easeOut" },
                }}
                d="M4 12L9 17L20 6"
                exit={{
                  pathLength: 0,
                  transition: { duration: 0.04, ease: "easeIn" },
                }}
                initial={{ pathLength: skipAnimation ? 1 : 0 }}
              />
            </m.svg>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

MenuItem.displayName = "MenuItem";

export { MenuItem };
export default MenuItem;
