"use client";

import { type MutableRefObject, useCallback } from "react";
import {
  resolveExplorerContextActionSelection,
  resolveExplorerMobileItemClickBehavior,
  shouldOpenExplorerItemOnDoubleClick,
} from "@/components/files/explorer/explorer-item-interactions-model";

interface ExplorerContextActionIds {
  ids: string[];
  itemId: string;
}

interface ExplorerItemSelectionApi {
  getSelectedIds: () => Set<string>;
  setItemSelected: (itemId: string, selected: boolean) => void;
  setSelection: (itemIds: string[], anchorId?: string) => void;
  startDragSelection: (event: React.PointerEvent<HTMLDivElement>) => void;
  toggleSelection: (itemId: string) => void;
}

interface UseExplorerItemInteractionsOptions {
  contextActionIdsRef: MutableRefObject<ExplorerContextActionIds | null>;
  isMobile: boolean;
  itemActionTargetSelector: string;
  mobileLongPressDelayMs: number;
  mobileLongPressTimerRef: MutableRefObject<ReturnType<
    typeof setTimeout
  > | null>;
  mobileSuppressClickRef: MutableRefObject<string | null>;
  onMobileCanvasLongPress: () => void;
  selection: ExplorerItemSelectionApi;
  triggerHaptic: (pattern: "selection" | "success") => void;
}

export function useExplorerItemInteractions({
  contextActionIdsRef,
  isMobile,
  itemActionTargetSelector,
  mobileLongPressDelayMs,
  mobileLongPressTimerRef,
  mobileSuppressClickRef,
  onMobileCanvasLongPress,
  selection,
  triggerHaptic,
}: UseExplorerItemInteractionsOptions) {
  const clearMobileLongPressTimer = useCallback(() => {
    if (mobileLongPressTimerRef.current) {
      clearTimeout(mobileLongPressTimerRef.current);
      mobileLongPressTimerRef.current = null;
    }
  }, [mobileLongPressTimerRef]);

  const isActionTarget = useCallback(
    (target: HTMLElement | null) =>
      Boolean(target?.closest(itemActionTargetSelector)),
    [itemActionTargetSelector]
  );

  const handleOpenOnDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>, open: () => void) => {
      const target = event.target as HTMLElement | null;
      if (
        !shouldOpenExplorerItemOnDoubleClick({
          clickDetail: event.detail,
          isActionTarget: isActionTarget(target),
        })
      ) {
        return;
      }

      open();
    },
    [isActionTarget]
  );

  const beginMobileItemLongPress = useCallback(
    (itemId: string) => {
      if (!isMobile) {
        return;
      }

      clearMobileLongPressTimer();
      const cancel = () => {
        clearMobileLongPressTimer();
        window.removeEventListener("pointerup", cancel);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("scroll", cancel, true);
      };
      mobileLongPressTimerRef.current = setTimeout(() => {
        mobileSuppressClickRef.current = itemId;
        selection.setItemSelected(itemId, true);
        triggerHaptic("selection");
        cancel();
      }, mobileLongPressDelayMs);
      window.addEventListener("pointerup", cancel);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("scroll", cancel, true);
    },
    [
      clearMobileLongPressTimer,
      isMobile,
      mobileLongPressDelayMs,
      mobileLongPressTimerRef,
      mobileSuppressClickRef,
      selection,
      triggerHaptic,
    ]
  );

  const handleMobileItemPointerUp = useCallback(() => {
    clearMobileLongPressTimer();
  }, [clearMobileLongPressTimer]);

  const handleMobileItemClick = useCallback(
    (
      itemId: string,
      openItem: () => void,
      options?: { toggleOnly?: boolean }
    ) => {
      const behavior = resolveExplorerMobileItemClickBehavior({
        isSuppressed: mobileSuppressClickRef.current === itemId,
        selectedCount: selection.getSelectedIds().size,
        toggleOnly: options?.toggleOnly,
      });

      if (behavior === "ignore") {
        mobileSuppressClickRef.current = null;
        return;
      }

      if (behavior === "toggle") {
        selection.toggleSelection(itemId);
        triggerHaptic("selection");
        return;
      }

      triggerHaptic("success");
      openItem();
    },
    [mobileSuppressClickRef, selection, triggerHaptic]
  );

  const handleItemContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, itemId: string) => {
      if (isMobile) {
        event.preventDefault();
        return;
      }

      const resolvedSelection = resolveExplorerContextActionSelection({
        itemId,
        selectedIds: Array.from(selection.getSelectedIds()),
      });
      contextActionIdsRef.current = {
        itemId,
        ids: resolvedSelection.ids,
      };

      if (resolvedSelection.shouldResetSelection) {
        selection.setSelection([itemId], itemId);
      }
    },
    [contextActionIdsRef, isMobile, selection]
  );

  const shouldIgnoreItemClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;
      return isActionTarget(target);
    },
    [isActionTarget]
  );

  const stopItemSelectionEvent = useCallback(
    (event: React.SyntheticEvent<HTMLElement>) => {
      event.stopPropagation();
    },
    []
  );

  const handleMobileCanvasPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isMobile || event.pointerType !== "touch" || event.button !== 0) {
        selection.startDragSelection(event);
        return;
      }

      const target = event.target as HTMLElement;
      if (target.closest("[data-select-item='true']")) {
        return;
      }

      if (target.closest("button, input, a, textarea, select, label")) {
        return;
      }

      clearMobileLongPressTimer();
      mobileLongPressTimerRef.current = setTimeout(() => {
        triggerHaptic("selection");
        onMobileCanvasLongPress();
      }, mobileLongPressDelayMs);

      const cancel = () => {
        clearMobileLongPressTimer();
        window.removeEventListener("pointerup", cancel);
        window.removeEventListener("pointercancel", cancel);
        window.removeEventListener("scroll", cancel, true);
      };

      window.addEventListener("pointerup", cancel);
      window.addEventListener("pointercancel", cancel);
      window.addEventListener("scroll", cancel, true);
    },
    [
      clearMobileLongPressTimer,
      isMobile,
      mobileLongPressDelayMs,
      mobileLongPressTimerRef,
      onMobileCanvasLongPress,
      selection,
      triggerHaptic,
    ]
  );

  return {
    clearMobileLongPressTimer,
    beginMobileItemLongPress,
    handleItemContextMenu,
    handleMobileCanvasPointerDown,
    handleMobileItemClick,
    handleMobileItemPointerUp,
    handleOpenOnDoubleClick,
    shouldIgnoreItemClick,
    stopItemSelectionEvent,
  };
}
