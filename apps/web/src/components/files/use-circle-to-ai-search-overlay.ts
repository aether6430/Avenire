"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  buildPathData,
  type CircleToAiSearchFileKind,
  clampPointToRect,
  getExpandedSelectionFromPath,
  getMessageTextContent,
  getSelectionBounds,
  MIN_SNAPSHOT_EDGE,
  type Point,
  pointInRect,
  type SelectionRect,
} from "@/components/files/circle-to-ai-search-model";
import {
  buildCircleToAiPanelPosition,
  buildCircleToAiViewportPanelPosition,
  canSubmitCircleToAiDraft,
  clampCircleToAiPanelPosition,
  getCircleToAiExpandedPanelHeight,
  getCircleToAiSearchOverlayState,
  isCircleToAiSelectionUsable,
} from "@/components/files/circle-to-ai-search-overlay-model";
import {
  type CircleToAiSnapshotTarget,
  getLocalPoint,
  getTargetRectWithinContainer,
  pickMediaTarget,
  renderSnapshotFromSelection,
} from "@/components/files/circle-to-ai-search-snapshot";

interface UseCircleToAiSearchOverlayProps {
  enabled: boolean;
  fileKind: CircleToAiSearchFileKind;
  onEnabledChange: (enabled: boolean) => void;
  workspaceUuid?: string;
}

export function useCircleToAiSearchOverlay({
  enabled,
  fileKind,
  onEnabledChange,
}: UseCircleToAiSearchOverlayProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    targetElement: CircleToAiSnapshotTarget;
  } | null>(null);
  const panelDragStateRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
  } | null>(null);
  const chatIdRef = useRef("");
  if (!chatIdRef.current) {
    chatIdRef.current = `halo-search-${crypto.randomUUID()}`;
  }

  const selectionSnapshotRef = useRef<{
    base64: string;
    mimeType: string;
  } | null>(null);
  const [selection, setSelection] = useState<SelectionRect | null>(null);
  const [selectionPath, setSelectionPath] = useState<Point[]>([]);
  const selectionPathRef = useRef<Point[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [panelPosition, setPanelPosition] = useState({ x: 12, y: 12 });
  const [containerSize, setContainerSize] = useState({ height: 0, width: 0 });
  const [containerOffset, setContainerOffset] = useState({ left: 0, top: 0 });
  const inputRef = useRef<HTMLInputElement | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          ephemeral: true,
        },
        prepareSendMessagesRequest: (options) => {
          const snapshot = selectionSnapshotRef.current;
          return {
            body: {
              ...options.body,
              id: options.id,
              messageId: options.messageId,
              messages: options.messages,
              selectionBase64: snapshot?.base64 ?? null,
              selectionMediaType: snapshot?.mimeType ?? null,
              trigger: options.trigger,
            },
          };
        },
      }),
    []
  );

  const { clearError, messages, sendMessage, setMessages, status, stop } =
    useChat<UIMessage>({
      id: chatIdRef.current,
      onError: (chatError) => {
        setError(chatError.message || "Apollo failed.");
      },
      onFinish: ({ message }) => {
        if (!getMessageTextContent(message)) {
          setError("No clear answer was returned.");
        }
      },
      transport,
    });

  const { loading, showTranscript } = useMemo(
    () =>
      getCircleToAiSearchOverlayState({
        error,
        messages,
        status,
      }),
    [error, messages, status]
  );

  const clampPanelPosition = useCallback(
    (nextPosition: { x: number; y: number }, expanded = showTranscript) => {
      return clampCircleToAiPanelPosition({
        containerHeight: containerSize.height,
        containerWidth: containerSize.width,
        expanded,
        nextPosition,
      });
    },
    [containerSize.height, containerSize.width, showTranscript]
  );

  const expandedPanelHeight = getCircleToAiExpandedPanelHeight(
    containerSize.height
  );

  const activeSelection = useMemo(
    () => getExpandedSelectionFromPath(selectionPath),
    [selectionPath]
  );

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateSize = () => {
      const rect = element.getBoundingClientRect();
      setContainerSize({
        height: element.clientHeight,
        width: element.clientWidth,
      });
      setContainerOffset({
        left: rect.left,
        top: rect.top,
      });
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    const handleViewportChange = () => updateSize();
    window.addEventListener("scroll", handleViewportChange, true);
    window.addEventListener("resize", handleViewportChange);
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleViewportChange, true);
      window.removeEventListener("resize", handleViewportChange);
    };
  }, []);

  useEffect(() => {
    selectionPathRef.current = selectionPath;
  }, [selectionPath]);

  const resetOverlayState = useCallback(() => {
    stop();
    clearError();
    setMessages([]);
    selectionSnapshotRef.current = null;
    dragStateRef.current = null;
    panelDragStateRef.current = null;
    setSelection(null);
    setSelectionPath([]);
    setDraft("");
    setPanelPosition({ x: 12, y: 12 });
    setError(null);
  }, [clearError, setMessages, stop]);

  useEffect(() => {
    if (!enabled) {
      resetOverlayState();
    }
  }, [enabled, resetOverlayState]);

  const clearSelection = useCallback(() => {
    resetOverlayState();
  }, [resetOverlayState]);

  const closeOverlay = useCallback(() => {
    resetOverlayState();
    onEnabledChange(false);
  }, [onEnabledChange, resetOverlayState]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeOverlay]);

  const finalizeSelection = async (input: {
    points: Point[];
    targetElement: CircleToAiSnapshotTarget;
  }) => {
    const { points, targetElement } = input;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const paddedSelection = getExpandedSelectionFromPath(points);
    if (!paddedSelection) {
      return;
    }

    setSelection(paddedSelection);
    setSelectionPath(points);
    setError(null);
    clearError();
    stop();
    setMessages([]);

    try {
      const snapshot = await renderSnapshotFromSelection({
        container,
        fileKind,
        path: points,
        selection: paddedSelection,
        targetElement,
      });
      if (!snapshot) {
        throw new Error("Unable to capture the selected area.");
      }
      if (
        snapshot.width < MIN_SNAPSHOT_EDGE ||
        snapshot.height < MIN_SNAPSHOT_EDGE
      ) {
        throw new Error("Selection is too small to inspect.");
      }
      if (!snapshot.base64) {
        throw new Error("Unable to encode the selected area.");
      }

      selectionSnapshotRef.current = {
        base64: snapshot.base64,
        mimeType: snapshot.mimeType,
      };
      setDraft("");
      setPanelPosition(
        clampPanelPosition(buildCircleToAiPanelPosition(paddedSelection), false)
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to inspect the selection."
      );
    }
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>) => {
    if (!enabled) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const start = getLocalPoint(event, bounds);
    const target = pickMediaTarget(element, start);
    if (!target) {
      return;
    }

    const targetBounds = getTargetRectWithinContainer(element, target);
    if (!pointInRect(start, targetBounds)) {
      return;
    }

    if (
      fileKind === "video" &&
      target instanceof HTMLVideoElement &&
      !target.paused
    ) {
      target.pause();
    }

    const clampedStart = clampPointToRect(start, targetBounds);

    dragStateRef.current = {
      pointerId: event.pointerId,
      targetElement: target,
    };
    stop();
    clearError();
    setMessages([]);
    setDraft("");
    setPanelPosition({ x: 12, y: 12 });
    selectionSnapshotRef.current = null;
    setSelectionPath([clampedStart]);
    setSelection({
      x: clampedStart.x,
      y: clampedStart.y,
      width: 1,
      height: 1,
    });
    setError(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const targetBounds = getTargetRectWithinContainer(
      element,
      dragState.targetElement
    );
    const nextPoint = clampPointToRect(
      getLocalPoint(event, bounds),
      targetBounds
    );
    setSelectionPath((current) => {
      const last = current.at(-1);
      if (last) {
        const distance = Math.hypot(nextPoint.x - last.x, nextPoint.y - last.y);
        if (distance < 3) {
          return current;
        }
      }

      const next = [...current, nextPoint];
      const nextBounds = getSelectionBounds(next);
      if (nextBounds) {
        setSelection(nextBounds);
      }
      return next;
    });
  };

  const handlePointerUp = async (event: ReactPointerEvent<HTMLElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) {
      return;
    }

    dragStateRef.current = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Ignore browsers that do not expose pointer capture on the synthetic event.
    }

    const element = containerRef.current;
    if (!element) {
      return;
    }

    const bounds = element.getBoundingClientRect();
    const targetBounds = getTargetRectWithinContainer(
      element,
      dragState.targetElement
    );
    const end = clampPointToRect(getLocalPoint(event, bounds), targetBounds);
    const points = [...selectionPathRef.current, end];
    const selectionBounds = getSelectionBounds(points);
    if (
      !isCircleToAiSelectionUsable({
        pointCount: points.length,
        selectionBounds,
      })
    ) {
      setSelection(null);
      setSelectionPath([]);
      return;
    }

    await finalizeSelection({
      points,
      targetElement: dragState.targetElement,
    });
  };

  const hasSelectionSnapshot = selectionSnapshotRef.current !== null;

  const handleDraftSubmit = useCallback(() => {
    if (
      !canSubmitCircleToAiDraft({
        draft,
        hasSelectionSnapshot: selectionSnapshotRef.current !== null,
        isLoading: loading,
      })
    ) {
      return;
    }

    clearError();
    setError(null);
    sendMessage({ text: draft.trim() });
    setDraft("");
  }, [clearError, draft, loading, sendMessage]);

  const handlePanelDragStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }

      panelDragStateRef.current = {
        offsetX: event.clientX - panelPosition.x,
        offsetY: event.clientY - panelPosition.y,
        pointerId: event.pointerId,
      };
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [panelPosition.x, panelPosition.y]
  );

  const handlePanelDragMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = panelDragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) {
        return;
      }

      setPanelPosition(
        clampPanelPosition(
          {
            x: event.clientX - dragState.offsetX,
            y: event.clientY - dragState.offsetY,
          },
          showTranscript
        )
      );
    },
    [clampPanelPosition, showTranscript]
  );

  const handlePanelDragEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore pointer capture mismatches on some browsers.
      }
      panelDragStateRef.current = null;
    },
    []
  );

  const selectionPathData = useMemo(
    () => buildPathData(selectionPath),
    [selectionPath]
  );

  useEffect(() => {
    if (!(selectionSnapshotRef.current && selection)) {
      return;
    }

    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selection]);

  useEffect(() => {
    if (!selection) {
      return;
    }

    setPanelPosition((current) => clampPanelPosition(current, showTranscript));
  }, [clampPanelPosition, selection, showTranscript]);

  return {
    activeSelection,
    clearSelection: closeOverlay,
    containerRef,
    containerSize,
    draft,
    error,
    expandedPanelHeight,
    handleDraftSubmit,
    handlePanelDragEnd,
    handlePanelDragMove,
    handlePanelDragStart,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasSelectionSnapshot,
    inputRef,
    loading,
    messages,
    selection,
    selectionPathData,
    setDraft,
    showTranscript,
    viewportPanelPosition: buildCircleToAiViewportPanelPosition({
      containerOffset,
      panelPosition,
    }),
  };
}
