"use client";

import type { ReactNode } from "react";
import type { CircleToAiSearchFileKind } from "./circle-to-ai-search-model";
import { CircleToAiSearchSurface } from "./circle-to-ai-search-surface";
import { useCircleToAiSearchOverlay } from "./use-circle-to-ai-search-overlay";

interface CircleToAiSearchOverlayProps {
  children: ReactNode;
  enabled: boolean;
  fileKind: CircleToAiSearchFileKind;
  fileName: string;
  onEnabledChange: (enabled: boolean) => void;
  workspaceUuid?: string;
}

export function CircleToAiSearchOverlay({
  children,
  enabled,
  fileKind,
  fileName,
  onEnabledChange,
  workspaceUuid,
}: CircleToAiSearchOverlayProps) {
  const overlay = useCircleToAiSearchOverlay({
    enabled,
    fileKind,
    onEnabledChange,
    workspaceUuid,
  });

  return (
    <div className="relative h-full min-h-0 w-full" ref={overlay.containerRef}>
      {children}

      <div className="pointer-events-none absolute inset-0 z-20">
        <CircleToAiSearchSurface
          activeSelection={overlay.activeSelection}
          clearSelection={overlay.clearSelection}
          containerSize={overlay.containerSize}
          draft={overlay.draft}
          enabled={enabled}
          error={overlay.error}
          expandedPanelHeight={overlay.expandedPanelHeight}
          fileName={fileName}
          hasSelectionSnapshot={overlay.hasSelectionSnapshot}
          inputRef={overlay.inputRef}
          isLoading={overlay.loading}
          messages={overlay.messages}
          onDismissOverlay={overlay.clearSelection}
          onDraftChange={overlay.setDraft}
          onDraftSubmit={overlay.handleDraftSubmit}
          onPanelDragEnd={overlay.handlePanelDragEnd}
          onPanelDragMove={overlay.handlePanelDragMove}
          onPanelDragStart={overlay.handlePanelDragStart}
          onPointerDown={overlay.handlePointerDown}
          onPointerMove={overlay.handlePointerMove}
          onPointerUp={overlay.handlePointerUp}
          selection={overlay.selection}
          selectionPathData={overlay.selectionPathData}
          showTranscript={overlay.showTranscript}
          viewportPanelPosition={overlay.viewportPanelPosition}
          workspaceUuid={workspaceUuid}
        />
      </div>

      <style global jsx>{`
        @keyframes circle-to-ai-shimmer {
          0% {
            transform: translateX(-115%);
          }
          100% {
            transform: translateX(115%);
          }
        }

        @keyframes circle-to-ai-dash {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -20;
          }
        }

        .shimmer-bar {
          position: relative;
          overflow: hidden;
        }

        .shimmer-bar::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            110deg,
            transparent 0%,
            rgba(255, 255, 255, 0.45) 35%,
            transparent 70%
          );
          animation: circle-to-ai-shimmer 1.2s linear infinite;
        }
      `}</style>
    </div>
  );
}
