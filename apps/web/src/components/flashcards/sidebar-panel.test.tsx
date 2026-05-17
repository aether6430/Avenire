import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { FlashcardsSidebarPanelSurfaceMock, useFlashcardsSidebarPanelMock } =
  vi.hoisted(() => ({
    FlashcardsSidebarPanelSurfaceMock: vi.fn(() => (
      <div>FLASHCARDS_SIDEBAR</div>
    )),
    useFlashcardsSidebarPanelMock: vi.fn(),
  }));

vi.mock("@/components/flashcards/flashcards-sidebar-panel-surface", () => ({
  FlashcardsSidebarPanelSurface: FlashcardsSidebarPanelSurfaceMock,
}));

vi.mock("@/components/flashcards/use-flashcards-sidebar-panel", () => ({
  useFlashcardsSidebarPanel: useFlashcardsSidebarPanelMock,
}));

import { FlashcardsSidebarPanel } from "@/components/flashcards/sidebar-panel";

describe("FlashcardsSidebarPanel", () => {
  it("wires the sidebar runtime hook into the surface", () => {
    useFlashcardsSidebarPanelMock.mockReturnValue({
      filteredSets: [],
      sets: [],
      setsLoadFailed: false,
      setsLoading: false,
    });

    const props = {
      active: true,
      activeSetId: "set-1",
      workspaceUuid: "workspace-1",
    };

    const html = renderToStaticMarkup(<FlashcardsSidebarPanel {...props} />);

    expect(useFlashcardsSidebarPanelMock).toHaveBeenCalledWith(props);
    expect(FlashcardsSidebarPanelSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          filteredSets: [],
          sets: [],
          setsLoadFailed: false,
          setsLoading: false,
        }),
      }),
      undefined
    );
    expect(html).toContain("FLASHCARDS_SIDEBAR");
  });
});
