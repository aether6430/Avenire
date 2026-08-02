"use client"

import * as React from "react"
import { m } from "framer-motion"

import { cn } from "../lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "./context-menu"

type ExpandableTabItem = {
  value: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  disabled?: boolean
}

type ExpandableTabsProps = {
  items: ExpandableTabItem[]
  value?: string | null
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  onItemClick?: (
    item: ExpandableTabItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void
  onItemContextMenu?: (
    item: ExpandableTabItem,
    event: React.MouseEvent<HTMLButtonElement>
  ) => void
  onItemHover?: (item: ExpandableTabItem) => void
  allowDeselect?: boolean
  className?: string
  persistenceKey?: string
  contextMenuContent?: (item: ExpandableTabItem) => React.ReactNode
}

function getNextIndex(
  startIndex: number,
  direction: 1 | -1,
  items: ExpandableTabItem[]
) {
  let i = startIndex
  for (let steps = 0; steps < items.length; steps += 1) {
    i = (i + direction + items.length) % items.length
    if (!items[i]?.disabled) return i
  }
  return startIndex
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
  contextMenuContent,
}: ExpandableTabsProps) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState<string | null>(
    defaultValue
  )
  const currentValue = isControlled ? value : internalValue

  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([])
  const bubbleLayoutId = persistenceKey
    ? `expandable-tabs-bubble-${persistenceKey}`
    : "expandable-tabs-bubble"

  const setValue = React.useCallback(
    (nextValue: string | null) => {
      if (!isControlled) {
        setInternalValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [isControlled, onValueChange]
  )

  const onSelect = React.useCallback(
    (itemValue: string) => {
      if (allowDeselect && currentValue === itemValue) {
        setValue(null)
        return
      }
      setValue(itemValue)
    },
    [allowDeselect, currentValue, setValue]
  )

  const onKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
      if (!items.length) return

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault()
        tabRefs.current[getNextIndex(index, 1, items)]?.focus()
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault()
        tabRefs.current[getNextIndex(index, -1, items)]?.focus()
      }
      if (event.key === "Home") {
        event.preventDefault()
        tabRefs.current[getNextIndex(0, 1, items)]?.focus()
      }
      if (event.key === "End") {
        event.preventDefault()
        tabRefs.current[getNextIndex(items.length - 1, -1, items)]?.focus()
      }
    },
    [items]
  )

  return (
    <div
      role="tablist"
      aria-label="Workspace section"
      className={cn(
        "inline-flex w-full items-center gap-1 rounded-xl border border-sidebar-border/80 bg-sidebar p-1",
        className
      )}
    >
      {items.map((item, index) => {
        const Icon = item.icon
        const isSelected = currentValue === item.value

        const button = (
          <button
            ref={(node) => {
              tabRefs.current[index] = node
            }}
            type="button"
            role="tab"
            aria-selected={isSelected}
            aria-controls={`expandable-tab-panel-${item.value}`}
            id={`expandable-tab-${item.value}`}
            tabIndex={isSelected || (currentValue === null && index === 0) ? 0 : -1}
            disabled={item.disabled}
            onClick={(event) => {
              onItemClick?.(item, event)
              if (event.defaultPrevented) {
                return
              }
              onSelect(item.value)
            }}
            onContextMenu={(event) => {
              onItemContextMenu?.(item, event)
            }}
            onFocus={() => onItemHover?.(item)}
            onMouseEnter={() => onItemHover?.(item)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "text-sidebar-foreground ring-sidebar-ring focus-visible:ring-2 relative inline-flex flex-1 items-center justify-center rounded-lg px-2 py-1.5 text-xs font-medium outline-hidden transition-colors cursor-pointer",
              isSelected
                ? "text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground",
              item.disabled && "pointer-events-none opacity-50"
            )}
          >
            {isSelected ? (
              <m.span
                layoutId={bubbleLayoutId}
                className="absolute inset-0 rounded-lg bg-sidebar-accent"
                transition={{
                  type: "spring",
                  stiffness: 420,
                  damping: 34,
                  mass: 0.8,
                }}
              />
            ) : null}
            <Icon className="relative z-10 size-3.5 shrink-0" aria-hidden="true" />
            <span className="sr-only">{item.label}</span>
          </button>
        )

        const menuContent = contextMenuContent?.(item)
        if (menuContent) {
          return (
            <ContextMenu key={item.value}>
              <ContextMenuTrigger render={<div className="contents" />}>
                {button}
              </ContextMenuTrigger>
              <ContextMenuContent side="bottom" align="start">
                {menuContent}
              </ContextMenuContent>
            </ContextMenu>
          )
        }

        return <React.Fragment key={item.value}>{button}</React.Fragment>
      })}
    </div>
  )
}

export type { ExpandableTabItem, ExpandableTabsProps }
