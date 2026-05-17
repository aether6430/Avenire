import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { StylizedSearchBarSurfaceMock, useStylizedSearchBarMock } = vi.hoisted(
  () => ({
    StylizedSearchBarSurfaceMock: vi.fn(() => (
      <div>STYLIZED_SEARCH_SURFACE</div>
    )),
    useStylizedSearchBarMock: vi.fn(),
  })
);

vi.mock("@/components/files/stylized-search-bar-surface", () => ({
  StylizedSearchBarSurface: StylizedSearchBarSurfaceMock,
}));

vi.mock("@/components/files/use-stylized-search-bar", () => ({
  useStylizedSearchBar: useStylizedSearchBarMock,
}));

import StylizedSearchBar from "@/components/files/stylized-search-bar";

describe("StylizedSearchBar", () => {
  it("wires the search runtime hook into the surface", () => {
    useStylizedSearchBarMock.mockReturnValue({
      aiSummary: "",
      containerRef: { current: null },
      isSearching: false,
      isSummaryStreaming: false,
      openResult: () => {},
      query: "",
      retrievalError: null,
      results: [],
      selectedValue: "",
      setQuery: () => {},
      setSelectedValue: () => {},
      showResults: false,
      triggerSearch: () => {},
      workspaceUuid: "workspace-1",
    });

    const props = {
      items: [],
      workspaceUuid: "workspace-1",
    };

    const html = renderToStaticMarkup(<StylizedSearchBar {...props} />);

    expect(useStylizedSearchBarMock).toHaveBeenCalledWith({
      focusSignal: undefined,
      initialQuery: "",
      initialResults: [],
      items: [],
      onApplyWorkspaceFilter: undefined,
      onOpenFileById: undefined,
      onOpenFolderById: undefined,
      onSearch: undefined,
      onSelectResult: undefined,
      selectedResultChunkId: undefined,
      workspaceUuid: "workspace-1",
    });
    expect(StylizedSearchBarSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filePathById: undefined,
        maxWidth: "max-w-5xl",
        placeholder: "Search anything...",
        runtime: expect.objectContaining({
          workspaceUuid: "workspace-1",
        }),
      }),
      undefined
    );
    expect(html).toContain("STYLIZED_SEARCH_SURFACE");
  });
});
