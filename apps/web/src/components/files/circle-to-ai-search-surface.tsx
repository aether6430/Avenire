"use client";

import type { UIMessage } from "ai";
import type { PointerEventHandler, RefObject } from "react";
import type { SelectionRect } from "@/components/files/circle-to-ai-search-model";
import { CircleToAiSearchPopover } from "@/components/files/circle-to-ai-search-popover";

interface CircleToAiSearchSurfaceProps {
  activeSelection: SelectionRect | null;
  clearSelection: () => void;
  containerSize: { height: number; width: number };
  draft: string;
  enabled: boolean;
  error: string | null;
  expandedPanelHeight: number;
  fileName: string;
  hasSelectionSnapshot: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  isLoading: boolean;
  messages: UIMessage[];
  onDismissOverlay: () => void;
  onDraftChange: (value: string) => void;
  onDraftSubmit: () => void;
  onPanelDragEnd: PointerEventHandler<HTMLDivElement>;
  onPanelDragMove: PointerEventHandler<HTMLDivElement>;
  onPanelDragStart: PointerEventHandler<HTMLDivElement>;
  onPointerDown: PointerEventHandler<HTMLElement>;
  onPointerMove: PointerEventHandler<HTMLElement>;
  onPointerUp: PointerEventHandler<HTMLElement>;
  selection: SelectionRect | null;
  selectionPathData: string;
  showTranscript: boolean;
  viewportPanelPosition: { x: number; y: number };
  workspaceUuid?: string;
}

export function CircleToAiSearchSurface({
  activeSelection,
  clearSelection,
  containerSize,
  draft,
  enabled,
  error,
  expandedPanelHeight,
  fileName,
  hasSelectionSnapshot,
  inputRef,
  isLoading,
  messages,
  onDismissOverlay,
  onDraftChange,
  onDraftSubmit,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPanelDragEnd,
  onPanelDragMove,
  onPanelDragStart,
  selection,
  selectionPathData,
  showTranscript,
  viewportPanelPosition,
  workspaceUuid,
}: CircleToAiSearchSurfaceProps) {
  if (!enabled) {
    return null;
  }

  return (
    <section
      aria-label="Apollo search surface"
      className="pointer-events-auto absolute inset-0 cursor-crosshair"
      onPointerDown={onPointerDown}
      onPointerDownCapture={(event) => {
        if (hasSelectionSnapshot && event.target === event.currentTarget) {
          event.preventDefault();
          event.stopPropagation();
          onDismissOverlay();
        }
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {activeSelection ? (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox={`0 0 ${containerSize.width} ${containerSize.height}`}
        >
          <title>Apollo selection overlay</title>
          <defs>
            <linearGradient
              id="circle-to-ai-fill-gradient"
              x1="0%"
              x2="100%"
              y1="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor="rgba(99,102,241,0)" />
              <stop offset="25%" stopColor="rgba(99,102,241,0.08)" />
              <stop offset="50%" stopColor="rgba(99,102,241,0.18)" />
              <stop offset="75%" stopColor="rgba(99,102,241,0.08)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0)" />
              <animateTransform
                attributeName="gradientTransform"
                dur="2s"
                repeatCount="indefinite"
                type="translate"
                values="-1 0; 1 0"
              />
            </linearGradient>
            <filter
              height="200%"
              id="circle-to-ai-glow"
              width="200%"
              x="-50%"
              y="-50%"
            >
              <feGaussianBlur result="blur" stdDeviation="3" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          <path
            d={selectionPathData}
            fill="url(#circle-to-ai-fill-gradient)"
            fillRule="evenodd"
            stroke="rgba(99,102,241,0.9)"
            strokeDasharray="6 4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            style={{
              animation: "circle-to-ai-dash 1s linear infinite",
              filter: "url(#circle-to-ai-glow)",
            }}
          />
        </svg>
      ) : null}

      {selection ? (
        <CircleToAiSearchPopover
          clearSelection={clearSelection}
          draft={draft}
          error={error}
          expandedHeight={expandedPanelHeight}
          fileName={fileName}
          inputRef={inputRef}
          isExpanded={showTranscript}
          isLoading={isLoading}
          loadingText="Apollo is thinking through the selection..."
          messages={messages}
          onDraftChange={onDraftChange}
          onDraftSubmit={onDraftSubmit}
          onDragEnd={onPanelDragEnd}
          onDragMove={onPanelDragMove}
          onDragStart={onPanelDragStart}
          showTranscript={showTranscript}
          viewportPosition={viewportPanelPosition}
          workspaceUuid={workspaceUuid}
        />
      ) : null}
    </section>
  );
}
