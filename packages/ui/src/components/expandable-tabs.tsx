"use client";

import { AnimatePresence, m } from "motion/react";
import * as React from "react";

import { cn } from "../lib/utils";

interface ExpandableTabItem {
  disabled?: boolean;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
  value: string;
}

interface ExpandableTabsProps {
  allowDeselect?: boolean;
  className?: string;
  defaultValue?: string | null;
  items: ExpandableTabItem[];
  onItemClick?: (
    item: ExpandableTabItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onItemContextMenu?: (
    item: ExpandableTabItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void;
  onItemHover?: (item: ExpandableTabItem) => void;
  onValueChange?: (value: string | null) => void;
  persistenceKey?: string;
  showSelectedLabel?: boolean;
  value?: string | null;
}

const lastMountedValueByPersistenceKey = new Map<string, string | null>();

function getNextIndex(
  startIndex: number,
  direction: 1 | -1,
  items: ExpandableTabItem[]
) {
  let i = startIndex;
  for (let steps = 0; steps < items.length; steps += 1) {
    i = (i + direction + items.length) % items.length;
    if (!items[i]?.disabled) {
      return i;
    }
  }
  return startIndex;
}

export function ExpandableTabs({
  items,
  value,
  defaultValue = null,
  onValueChange,
  onItemClick,
  onItemContextMenu,
  onItemHover,
  allowDeselect = true,
  className,
  persistenceKey,
  showSelectedLabel = true,
}: ExpandableTabsProps) {
  const isControlled = value !== undefined;
  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue
  );
  const currentValue = isControlled ? value : internalValue;
  const [hasMounted, setHasMounted] = React.useState(false);
  const initialPersistedValue = React.useMemo(
    () =>
      persistenceKey
        ? (lastMountedValueByPersistenceKey.get(persistenceKey) ?? null)
        : null,
    [persistenceKey]
  );
  const shouldAnimateOnInitialMount = persistenceKey
    ? initialPersistedValue !== null && initialPersistedValue !== currentValue
    : true;

  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  React.useEffect(() => {
    if (!persistenceKey) {
      return;
    }

    lastMountedValueByPersistenceKey.set(persistenceKey, currentValue ?? null);
  }, [currentValue, persistenceKey]);

  const setValue = React.useCallback(
    (nextValue: string | null) => {
      if (!isControlled) {
        setInternalValue(nextValue);
      }
      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange]
  );

  const onSelect = React.useCallback(
    (itemValue: string) => {
      if (allowDeselect && currentValue === itemValue) {
        setValue(null);
        return;
      }
      setValue(itemValue);
    },
    [allowDeselect, currentValue, setValue]
  );

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!items.length) {
        return;
      }

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        tabRefs.current[getNextIndex(index, 1, items)]?.focus();
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        tabRefs.current[getNextIndex(index, -1, items)]?.focus();
      }
      if (event.key === "Home") {
        event.preventDefault();
        tabRefs.current[getNextIndex(0, 1, items)]?.focus();
      }
      if (event.key === "End") {
        event.preventDefault();
        tabRefs.current[getNextIndex(items.length - 1, -1, items)]?.focus();
      }
    },
    [items]
  );

  return (
    <div
      aria-label="Workspace section"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-xl border border-sidebar-border/80 bg-sidebar p-1",
        className
      )}
      role="tablist"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isSelected = currentValue === item.value;

        return (
          <m.button
            aria-controls={`expandable-tab-panel-${item.value}`}
            aria-selected={isSelected}
            className={cn(
              "relative inline-flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg px-2 py-1.5 font-medium text-xs outline-hidden ring-sidebar-ring transition-colors focus-visible:ring-2",
              item.disabled && "pointer-events-none opacity-50"
            )}
            data-selected={isSelected ? "true" : undefined}
            data-slot="expandable-tabs-trigger"
            disabled={item.disabled}
            id={`expandable-tab-${item.value}`}
            key={item.value}
            onClick={(event) => {
              onItemClick?.(item, event);
              if (event.defaultPrevented) {
                return;
              }
              onSelect(item.value);
            }}
            onContextMenu={(event) => {
              onItemContextMenu?.(item, event);
            }}
            onFocus={() => onItemHover?.(item)}
            onKeyDown={(event) => onKeyDown(event, index)}
            onMouseEnter={() => onItemHover?.(item)}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            role="tab"
            tabIndex={
              isSelected || (currentValue === null && index === 0) ? 0 : -1
            }
            type="button"
          >
            <Icon aria-hidden="true" className="size-3.5 shrink-0" />
            {showSelectedLabel ? (
              <>
                <AnimatePresence initial={false}>
                  {isSelected ? (
                    <m.span
                      animate={{ width: "auto", opacity: 1 }}
                      className="overflow-hidden whitespace-nowrap"
                      exit={{ width: 0, opacity: 0 }}
                      initial={
                        hasMounted || shouldAnimateOnInitialMount
                          ? { width: 0, opacity: 0 }
                          : false
                      }
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      {item.label}
                    </m.span>
                  ) : null}
                </AnimatePresence>
                {isSelected ? null : (
                  <span className="sr-only">{item.label}</span>
                )}
              </>
            ) : (
              <span className="sr-only">{item.label}</span>
            )}
          </m.button>
        );
      })}
    </div>
  );
}

export type { ExpandableTabItem, ExpandableTabsProps };
