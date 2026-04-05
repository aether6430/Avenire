import { useCallback, useRef, useState } from "react";

function intersects(a: DOMRect, b: DOMRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

interface UseFileSelectionOptions {
  gridRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
}

export function useFileSelection({ gridRef, itemRefs }: UseFileSelectionOptions) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const selectionAnchorIdRef = useRef<string | null>(null);

  const updateSelectedIds = useCallback(
    (updater: Set<string> | ((current: Set<string>) => Set<string>)) => {
      const current = selectedIdsRef.current;
      const next = typeof updater === "function" ? updater(current) : updater;
      selectedIdsRef.current = next;
      setSelectedIds(next);
    },
    []
  );

  const clearSelection = useCallback(() => {
    const next = new Set<string>();
    selectedIdsRef.current = next;
    setSelectedIds(next);
    selectionAnchorIdRef.current = null;
    setSelectionAnchorId(null);
  }, []);

  const setAnchor = useCallback((itemId: string | null) => {
    selectionAnchorIdRef.current = itemId;
    setSelectionAnchorId(itemId);
  }, []);

  const toggleSelection = useCallback((itemId: string) => {
    updateSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
    setAnchor(itemId);
  }, [setAnchor, updateSelectedIds]);

  const setItemSelected = useCallback((itemId: string, selected: boolean) => {
    updateSelectedIds((previous) => {
      const next = new Set(previous);
      if (selected) {
        next.add(itemId);
      } else {
        next.delete(itemId);
      }
      return next;
    });
    setAnchor(itemId);
  }, [setAnchor, updateSelectedIds]);

  const setSelection = useCallback((itemIds: string[], anchorId?: string | null) => {
    const next = new Set(itemIds);
    selectedIdsRef.current = next;
    setSelectedIds(next);
    setAnchor(anchorId ?? itemIds[0] ?? null);
  }, [setAnchor]);

  const startDragSelection = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest("[data-select-item='true']")) {
        return;
      }

      if (target.closest("button, input, a")) {
        return;
      }

      const container = gridRef.current;
      if (!container) {
        return;
      }

      event.preventDefault();

      const bounds = container.getBoundingClientRect();
      const startX = event.clientX - bounds.left;
      const startY = event.clientY - bounds.top;
      let hasMoved = false;

      clearSelection();

      const handleMove = (moveEvent: PointerEvent) => {
        const x = moveEvent.clientX - bounds.left;
        const y = moveEvent.clientY - bounds.top;
        const left = Math.min(startX, x);
        const top = Math.min(startY, y);
        const width = Math.abs(x - startX);
        const height = Math.abs(y - startY);

        if (width > 2 || height > 2) {
          hasMoved = true;
        }

        const nextRect = new DOMRect(left, top, width, height);
        setSelectionRect(nextRect);

        const selected = new Set<string>();

        itemRefs.current.forEach((element, id) => {
          const itemBounds = element.getBoundingClientRect();
          const localRect = new DOMRect(
            itemBounds.left - bounds.left,
            itemBounds.top - bounds.top,
            itemBounds.width,
            itemBounds.height,
          );

          if (intersects(nextRect, localRect)) {
            selected.add(id);
          }
        });

        updateSelectedIds(selected);
      };

      const handleUp = () => {
        if (!hasMoved) {
          clearSelection();
        }
        setSelectionRect(null);
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
    },
    [clearSelection, gridRef, itemRefs, updateSelectedIds],
  );

  const handleItemClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>, itemId: string, visibleItemIds: string[]) => {
      const isMultiToggle = event.metaKey || event.ctrlKey;
      const isRangeSelect = event.shiftKey;
      const currentSelectedIds = selectedIdsRef.current;

      if (isRangeSelect) {
        const anchorId =
          selectionAnchorIdRef.current ??
          currentSelectedIds.values().next().value ??
          itemId;
        const anchorIndex = visibleItemIds.indexOf(anchorId);
        const targetIndex = visibleItemIds.indexOf(itemId);

        if (anchorIndex === -1 || targetIndex === -1) {
          setSelection([itemId], itemId);
          return;
        }

        const [start, end] =
          anchorIndex < targetIndex ? [anchorIndex, targetIndex] : [targetIndex, anchorIndex];
        const range = visibleItemIds.slice(start, end + 1);
        setSelection(range, anchorId);
        return;
      }

      if (isMultiToggle) {
        toggleSelection(itemId);
        return;
      }

      setSelection([itemId], itemId);
    },
    [setSelection, toggleSelection],
  );

  const prepareDrag = useCallback(
    (itemId: string) => {
      const currentSelectedIds = selectedIdsRef.current;
      const sourceIds = currentSelectedIds.has(itemId)
        ? Array.from(currentSelectedIds)
        : [itemId];
      const next = new Set(sourceIds);
      selectedIdsRef.current = next;
      setSelectedIds(next);
      if (!currentSelectedIds.has(itemId)) {
        setAnchor(itemId);
      }
      return sourceIds;
    },
    [setAnchor],
  );

  const getSelectedIds = useCallback(() => selectedIdsRef.current, []);

  return {
    selectedIds,
    selectedCount: selectedIds.size,
    getSelectedIds,
    selectionRect,
    clearSelection,
    setSelection,
    setItemSelected,
    toggleSelection,
    startDragSelection,
    handleItemClick,
    prepareDrag,
  };
}
