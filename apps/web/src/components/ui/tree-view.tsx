"use client";

import {
  CaretRight as ChevronRight,
  File,
  Folder,
  FolderOpen,
} from "@phosphor-icons/react";
import { measureElement, useVirtualizer } from "@tanstack/react-virtual";
import type { HTMLAttributes, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TreeDataItem {
  actions?: ReactNode;
  children?: TreeDataItem[];
  className?: string;
  disabled?: boolean;
  draggable?: boolean;
  droppable?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  id: string;
  name: string;
  onClick?: () => void;
  onContextMenu?: () => void;
  openIcon?: React.ComponentType<{ className?: string }>;
  selectedIcon?: React.ComponentType<{ className?: string }>;
}

export interface TreeRenderItemParams {
  depth: number;
  isExpanded: boolean;
  isSelected: boolean;
  item: TreeDataItem;
}

type TreeProps = HTMLAttributes<HTMLDivElement> & {
  data: TreeDataItem[] | TreeDataItem;
  expandedItemIds?: string[];
  initialExpandedItemIds?: string[];
  initialSelectedItemId?: string;
  onExpandedChange?: (itemIds: string[]) => void;
  onMoveItem?: (draggedItemId: string, targetItemId: string) => void;
  onSelectChange?: (item: TreeDataItem | undefined) => void;
  renderItem?: (params: TreeRenderItemParams) => ReactNode;
  expandAll?: boolean;
  defaultNodeIcon?: React.ComponentType<{ className?: string }>;
  defaultLeafIcon?: React.ComponentType<{ className?: string }>;
  selectedItemId?: string;
};

const DEFAULT_NODE_ICON = Folder;
const DEFAULT_OPEN_ICON = FolderOpen;
const DEFAULT_LEAF_ICON = File;
const TREE_ROW_ESTIMATE = 38;

interface VisibleTreeItem {
  depth: number;
  item: TreeDataItem;
}

function flattenTree(items: TreeDataItem[], map: Map<string, TreeDataItem>) {
  for (const item of items) {
    map.set(item.id, item);
    if (item.children?.length) {
      flattenTree(item.children, map);
    }
  }
}

function areSetsEqual(left: Set<string>, right: Set<string>) {
  if (left.size !== right.size) {
    return false;
  }
  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }
  return true;
}

function flattenVisibleTree(
  items: TreeDataItem[],
  expandedItemIds: Set<string>,
  depth = 0,
  visibleItems: VisibleTreeItem[] = []
) {
  for (const item of items) {
    visibleItems.push({ depth, item });
    if (item.children?.length && expandedItemIds.has(item.id)) {
      flattenVisibleTree(
        item.children,
        expandedItemIds,
        depth + 1,
        visibleItems
      );
    }
  }
  return visibleItems;
}

export function TreeView({
  className,
  data,
  expandedItemIds: controlledExpandedItemIds,
  initialSelectedItemId,
  initialExpandedItemIds,
  onExpandedChange,
  onMoveItem,
  onSelectChange,
  renderItem,
  expandAll = false,
  defaultLeafIcon: DefaultLeafIcon = DEFAULT_LEAF_ICON,
  defaultNodeIcon: DefaultNodeIcon = DEFAULT_NODE_ICON,
  selectedItemId: controlledSelectedItemId,
  ...props
}: TreeProps) {
  const items = useMemo(() => (Array.isArray(data) ? data : [data]), [data]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemMap = useMemo(() => {
    const map = new Map<string, TreeDataItem>();
    flattenTree(items, map);
    return map;
  }, [items]);

  const [uncontrolledSelectedItemId, setUncontrolledSelectedItemId] = useState(
    initialSelectedItemId
  );
  const [uncontrolledExpandedItemIds, setUncontrolledExpandedItemIds] =
    useState<Set<string>>(() => {
      if (controlledExpandedItemIds) {
        return new Set(controlledExpandedItemIds);
      }
      if (expandAll) {
        return new Set(Array.from(itemMap.keys()));
      }
      return new Set(initialExpandedItemIds ?? []);
    });
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dropTargetItemId, setDropTargetItemId] = useState<string | null>(null);

  const expandedItemIds = useMemo(() => {
    if (controlledExpandedItemIds) {
      return new Set(controlledExpandedItemIds);
    }
    if (expandAll) {
      return new Set(Array.from(itemMap.keys()));
    }
    return uncontrolledExpandedItemIds;
  }, [
    controlledExpandedItemIds,
    expandAll,
    itemMap,
    uncontrolledExpandedItemIds,
  ]);
  const visibleItems = useMemo(
    () => flattenVisibleTree(items, expandedItemIds),
    [expandedItemIds, items]
  );
  const selectedItemId = controlledSelectedItemId ?? uncontrolledSelectedItemId;

  useEffect(() => {
    if (
      controlledSelectedItemId !== undefined ||
      initialSelectedItemId === undefined
    ) {
      return;
    }
    setUncontrolledSelectedItemId(initialSelectedItemId);
  }, [controlledSelectedItemId, initialSelectedItemId]);

  useEffect(() => {
    if (controlledExpandedItemIds || expandAll || !initialExpandedItemIds) {
      return;
    }
    const next = new Set(initialExpandedItemIds);
    setUncontrolledExpandedItemIds((current) => {
      if (areSetsEqual(current, next)) {
        return current;
      }
      return next;
    });
  }, [controlledExpandedItemIds, expandAll, initialExpandedItemIds]);

  useEffect(() => {
    if (!expandAll || controlledExpandedItemIds) {
      return;
    }
    setUncontrolledExpandedItemIds(new Set(Array.from(itemMap.keys())));
  }, [controlledExpandedItemIds, expandAll, itemMap]);

  const toggleExpanded = useCallback(
    (itemId: string) => {
      const next = new Set(expandedItemIds);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      if (!controlledExpandedItemIds) {
        setUncontrolledExpandedItemIds(next);
      }
      onExpandedChange?.(Array.from(next));
    },
    [controlledExpandedItemIds, expandedItemIds, onExpandedChange]
  );

  const handleSelect = useCallback(
    (item: TreeDataItem) => {
      if (item.disabled) {
        return;
      }
      if (controlledSelectedItemId === undefined) {
        setUncontrolledSelectedItemId(item.id);
      }
      if (onSelectChange) {
        onSelectChange(item);
        return;
      }
      item.onClick?.();
    },
    [controlledSelectedItemId, onSelectChange]
  );

  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    estimateSize: () => TREE_ROW_ESTIMATE,
    getScrollElement: () => containerRef.current,
    measureElement,
    overscan: 8,
  });
  const virtualItems = virtualizer.getVirtualItems();

  const renderRow = useCallback(
    ({ item, depth }: VisibleTreeItem) => {
      const hasChildren = Boolean(item.children?.length);
      const isExpanded = expandedItemIds.has(item.id);
      const isSelected = selectedItemId === item.id;
      const isDropTarget = dropTargetItemId === item.id;

      let fallbackIcon = DefaultLeafIcon;
      if (hasChildren) {
        fallbackIcon = isExpanded ? DEFAULT_OPEN_ICON : DefaultNodeIcon;
      }
      const Icon =
        (isSelected && item.selectedIcon) ||
        (isExpanded && item.openIcon) ||
        item.icon ||
        fallbackIcon;

      const content = renderItem?.({
        depth,
        isExpanded,
        isSelected,
        item,
      });

      return (
        <div className={cn("min-w-0", item.className)} data-tree-id={item.id}>
          <div
            aria-expanded={hasChildren ? isExpanded : undefined}
            className={cn(
              "group/tree-row flex w-full min-w-0 items-center gap-2 rounded-xl px-2 py-1.5 transition-colors",
              "hover:bg-primary/6",
              isSelected && "bg-primary/10 text-primary ring-1 ring-primary/20",
              isDropTarget && "bg-primary/12 ring-1 ring-primary/30",
              item.disabled && "pointer-events-none opacity-50"
            )}
            draggable={item.draggable}
            onClick={() => handleSelect(item)}
            onContextMenu={(event) => {
              event.preventDefault();
              item.onContextMenu?.();
            }}
            onDragEnd={() => {
              setDraggedItemId(null);
              setDropTargetItemId(null);
            }}
            onDragLeave={() => {
              setDropTargetItemId((current) =>
                current === item.id ? null : current
              );
            }}
            onDragOver={(event) => {
              if (
                !(item.droppable && draggedItemId && draggedItemId !== item.id)
              ) {
                return;
              }
              event.preventDefault();
              setDropTargetItemId(item.id);
            }}
            onDragStart={() => {
              if (!item.draggable) {
                return;
              }
              setDraggedItemId(item.id);
            }}
            onDrop={(event) => {
              if (
                !(item.droppable && draggedItemId && draggedItemId !== item.id)
              ) {
                return;
              }
              event.preventDefault();
              onMoveItem?.(draggedItemId, item.id);
              setDraggedItemId(null);
              setDropTargetItemId(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                handleSelect(item);
              }
              if (hasChildren && event.key === "ArrowRight" && !isExpanded) {
                event.preventDefault();
                toggleExpanded(item.id);
              }
              if (hasChildren && event.key === "ArrowLeft" && isExpanded) {
                event.preventDefault();
                toggleExpanded(item.id);
              }
            }}
            role="treeitem"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            tabIndex={0}
          >
            {hasChildren ? (
              <button
                className="inline-flex size-5 shrink-0 items-center justify-center rounded-md hover:bg-primary/8"
                onClick={(event) => {
                  event.stopPropagation();
                  toggleExpanded(item.id);
                }}
                type="button"
              >
                <ChevronRight
                  className={cn(
                    "size-3.5 transition-transform",
                    isExpanded && "rotate-90"
                  )}
                />
              </button>
            ) : (
              <span className="size-5 shrink-0" />
            )}
            <Icon className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
            {content}
            {item.actions ? (
              <div className="ml-auto flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within/tree-row:opacity-100 group-hover/tree-row:opacity-100">
                {item.actions}
              </div>
            ) : null}
          </div>
        </div>
      );
    },
    [
      DefaultLeafIcon,
      DefaultNodeIcon,
      draggedItemId,
      dropTargetItemId,
      expandedItemIds,
      handleSelect,
      onMoveItem,
      renderItem,
      selectedItemId,
      toggleExpanded,
    ]
  );

  return (
    <div
      className={cn("min-h-0 overflow-auto", className)}
      ref={containerRef}
      role="tree"
      {...props}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => (
          <div
            data-index={virtualItem.index}
            key={virtualItem.key}
            ref={virtualizer.measureElement}
            style={{
              left: 0,
              position: "absolute",
              top: 0,
              transform: `translateY(${virtualItem.start}px)`,
              width: "100%",
            }}
          >
            {renderRow(visibleItems[virtualItem.index] as VisibleTreeItem)}
          </div>
        ))}
      </div>
    </div>
  );
}
