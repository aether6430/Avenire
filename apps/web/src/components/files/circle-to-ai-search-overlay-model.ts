import type { UIMessage } from "ai";
import type { SelectionRect } from "@/components/files/circle-to-ai-search-model";

const PANEL_MARGIN = 8;
const PANEL_WIDTH_PADDING = 16;
const COLLAPSED_PANEL_HEIGHT = 136;
const EXPANDED_PANEL_MAX_HEIGHT = 512;
const MIN_SELECTION_EDGE = 10;

export function getCircleToAiSearchOverlayState(input: {
  error: string | null;
  messages: UIMessage[];
  status: "submitted" | "streaming" | "ready" | "error";
}) {
  const loading = input.status === "submitted" || input.status === "streaming";
  const hasConversation = input.messages.length > 0;
  const showTranscript = hasConversation || loading || input.error !== null;

  return {
    hasConversation,
    loading,
    showTranscript,
  };
}

export function getCircleToAiExpandedPanelHeight(containerHeight: number) {
  return Math.min(
    EXPANDED_PANEL_MAX_HEIGHT,
    Math.max(COLLAPSED_PANEL_HEIGHT, containerHeight - PANEL_WIDTH_PADDING)
  );
}

export function clampCircleToAiPanelPosition(input: {
  containerHeight: number;
  containerWidth: number;
  expanded: boolean;
  nextPosition: { x: number; y: number };
}) {
  const panelWidth = Math.min(
    384,
    Math.max(0, input.containerWidth - PANEL_WIDTH_PADDING)
  );
  const expandedHeight = getCircleToAiExpandedPanelHeight(
    input.containerHeight
  );
  const panelHeight = input.expanded ? expandedHeight : COLLAPSED_PANEL_HEIGHT;
  const maxX = Math.max(
    PANEL_MARGIN,
    input.containerWidth - panelWidth - PANEL_MARGIN
  );
  const maxY = Math.max(
    PANEL_MARGIN,
    input.containerHeight - panelHeight - PANEL_MARGIN
  );

  return {
    x: Math.min(maxX, Math.max(PANEL_MARGIN, input.nextPosition.x)),
    y: Math.min(maxY, Math.max(PANEL_MARGIN, input.nextPosition.y)),
  };
}

export function buildCircleToAiPanelPosition(selection: SelectionRect) {
  return {
    x: selection.x + selection.width + 14,
    y: selection.y + (selection.height > 120 ? 12 : -8),
  };
}

export function isCircleToAiSelectionUsable(input: {
  pointCount: number;
  selectionBounds: SelectionRect | null;
}) {
  return Boolean(
    input.selectionBounds &&
      input.selectionBounds.width >= MIN_SELECTION_EDGE &&
      input.selectionBounds.height >= MIN_SELECTION_EDGE &&
      input.pointCount >= 3
  );
}

export function canSubmitCircleToAiDraft(input: {
  draft: string;
  hasSelectionSnapshot: boolean;
  isLoading: boolean;
}) {
  return (
    input.draft.trim().length > 0 &&
    input.hasSelectionSnapshot &&
    !input.isLoading
  );
}

export function buildCircleToAiViewportPanelPosition(input: {
  containerOffset: { left: number; top: number };
  panelPosition: { x: number; y: number };
}) {
  return {
    x: input.containerOffset.left + input.panelPosition.x,
    y: input.containerOffset.top + input.panelPosition.y,
  };
}
