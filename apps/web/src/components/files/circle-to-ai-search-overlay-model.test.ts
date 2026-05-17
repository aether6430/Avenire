import { describe, expect, it } from "vitest";
import {
  buildCircleToAiPanelPosition,
  buildCircleToAiViewportPanelPosition,
  canSubmitCircleToAiDraft,
  clampCircleToAiPanelPosition,
  getCircleToAiExpandedPanelHeight,
  getCircleToAiSearchOverlayState,
  isCircleToAiSelectionUsable,
} from "@/components/files/circle-to-ai-search-overlay-model";

describe("circle to ai search overlay model", () => {
  it("derives the overlay state from messages, status, and errors", () => {
    expect(
      getCircleToAiSearchOverlayState({
        error: null,
        messages: [],
        status: "ready",
      })
    ).toEqual({
      hasConversation: false,
      loading: false,
      showTranscript: false,
    });

    expect(
      getCircleToAiSearchOverlayState({
        error: "Apollo failed.",
        messages: [],
        status: "error",
      }).showTranscript
    ).toBe(true);
  });

  it("clamps and positions the panel within the container bounds", () => {
    expect(getCircleToAiExpandedPanelHeight(220)).toBe(204);
    expect(
      clampCircleToAiPanelPosition({
        containerHeight: 400,
        containerWidth: 320,
        expanded: false,
        nextPosition: { x: 400, y: -20 },
      })
    ).toEqual({ x: 8, y: 8 });

    expect(
      buildCircleToAiPanelPosition({
        height: 140,
        width: 60,
        x: 20,
        y: 30,
      })
    ).toEqual({ x: 94, y: 42 });
  });

  it("keeps selection and draft validation explicit", () => {
    expect(
      isCircleToAiSelectionUsable({
        pointCount: 3,
        selectionBounds: { height: 12, width: 18, x: 1, y: 2 },
      })
    ).toBe(true);
    expect(
      isCircleToAiSelectionUsable({
        pointCount: 2,
        selectionBounds: { height: 12, width: 18, x: 1, y: 2 },
      })
    ).toBe(false);

    expect(
      canSubmitCircleToAiDraft({
        draft: "  ask about this  ",
        hasSelectionSnapshot: true,
        isLoading: false,
      })
    ).toBe(true);
    expect(
      buildCircleToAiViewportPanelPosition({
        containerOffset: { left: 100, top: 200 },
        panelPosition: { x: 12, y: 18 },
      })
    ).toEqual({ x: 112, y: 218 });
  });
});
