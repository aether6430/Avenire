"use client";

import * as React from "react";

export const DEFAULT_POPUP_EXIT_DURATION_MS = 260;

interface DeferredUnmountActions {
  unmount: () => void;
}

interface DeferredOpenChangeDetails {
  isCanceled?: boolean;
  preventUnmountOnClose?: () => void;
}

interface DeferredUnmountRootOptions<
  Actions extends DeferredUnmountActions,
  EventDetails extends DeferredOpenChangeDetails,
> {
  actionsRef?: React.RefObject<Actions | null>;
  exitDurationMs?: number;
  onOpenChange?: (open: boolean, eventDetails: EventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
}

export function useDeferredUnmountRoot<
  Actions extends DeferredUnmountActions,
  EventDetails extends DeferredOpenChangeDetails,
>({
  actionsRef,
  exitDurationMs = DEFAULT_POPUP_EXIT_DURATION_MS,
  onOpenChange,
  onOpenChangeComplete,
}: DeferredUnmountRootOptions<Actions, EventDetails>) {
  const fallbackActionsRef = React.useRef<Actions | null>(null);
  const resolvedActionsRef = actionsRef ?? fallbackActionsRef;
  const closeTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const closeCompleteSentRef = React.useRef(false);

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current === null) {
      return;
    }

    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const finishClose = React.useCallback(() => {
    closeTimerRef.current = null;
    closeCompleteSentRef.current = true;
    resolvedActionsRef.current?.unmount();
    onOpenChangeComplete?.(false);
  }, [onOpenChangeComplete, resolvedActionsRef]);

  const handleOpenChange = React.useCallback(
    (open: boolean, eventDetails: EventDetails) => {
      if (open) {
        clearCloseTimer();
        closeCompleteSentRef.current = false;
        onOpenChange?.(true, eventDetails);
        return;
      }

      eventDetails.preventUnmountOnClose?.();
      onOpenChange?.(false, eventDetails);

      if (eventDetails.isCanceled) {
        return;
      }

      clearCloseTimer();
      closeCompleteSentRef.current = false;
      closeTimerRef.current = setTimeout(finishClose, exitDurationMs);
    },
    [clearCloseTimer, exitDurationMs, finishClose, onOpenChange]
  );

  const handleOpenChangeComplete = React.useCallback(
    (open: boolean) => {
      if (open) {
        clearCloseTimer();
        closeCompleteSentRef.current = false;
        onOpenChangeComplete?.(true);
        return;
      }

      if (closeTimerRef.current !== null || closeCompleteSentRef.current) {
        return;
      }

      closeCompleteSentRef.current = true;
      onOpenChangeComplete?.(false);
    },
    [clearCloseTimer, onOpenChangeComplete]
  );

  React.useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return {
    actionsRef: resolvedActionsRef,
    onOpenChange: handleOpenChange,
    onOpenChangeComplete: handleOpenChangeComplete,
  };
}
