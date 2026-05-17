import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { FlashcardsDashboardSurfaceMock, useFlashcardsDashboardMock } =
  vi.hoisted(() => ({
    FlashcardsDashboardSurfaceMock: vi.fn(() => <div>FLASHCARDS_SURFACE</div>),
    useFlashcardsDashboardMock: vi.fn(),
  }));

vi.mock("@/components/flashcards/flashcards-dashboard-surface", () => ({
  FlashcardsDashboardSurface: FlashcardsDashboardSurfaceMock,
}));

vi.mock("@/components/flashcards/use-flashcards-dashboard", () => ({
  useFlashcardsDashboard: useFlashcardsDashboardMock,
}));

import { FlashcardsDashboard } from "@/components/flashcards/dashboard";

describe("FlashcardsDashboard", () => {
  it("wires the dashboard runtime hook into the flashcards surface", () => {
    useFlashcardsDashboardMock.mockReturnValue({
      busy: false,
      orderedSets: [],
      reviewTarget: null,
      selectedSet: null,
    });

    const props = {
      generationRequest: null,
      initialDashboard: {
        cardSnapshots: [],
        sets: [],
      },
    };

    const html = renderToStaticMarkup(<FlashcardsDashboard {...props} />);

    expect(useFlashcardsDashboardMock).toHaveBeenCalledWith(props);
    expect(FlashcardsDashboardSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          busy: false,
          orderedSets: [],
          reviewTarget: null,
          selectedSet: null,
        }),
      }),
      undefined
    );
    expect(html).toContain("FLASHCARDS_SURFACE");
  });
});
