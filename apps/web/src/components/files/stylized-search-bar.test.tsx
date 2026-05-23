import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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

const stylizedSearchBarRuntimeFile = resolve(
  import.meta.dirname,
  "./use-stylized-search-bar.ts"
);

describe("StylizedSearchBar", () => {
  it("wires the search runtime hook into the surface", () => {
    const runtimeSource = readFileSync(stylizedSearchBarRuntimeFile, "utf8");
    useStylizedSearchBarMock.mockReturnValue({
      containerRef: { current: null },
      isSearching: false,
      query: "",
      retrievalError: null,
      results: [],
      setQuery: () => {},
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
      onSearch: undefined,
      workspaceUuid: "workspace-1",
    });
    expect(StylizedSearchBarSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        maxWidth: "max-w-5xl",
        placeholder: "Search anything...",
        runtime: expect.objectContaining({
          workspaceUuid: "workspace-1",
        }),
      }),
      undefined
    );
    expect(runtimeSource).toContain("queryWorkspaceRetrievalApi({");
    expect(runtimeSource).not.toContain("limit: 8");
    expect(html).toContain("STYLIZED_SEARCH_SURFACE");
  });
});
