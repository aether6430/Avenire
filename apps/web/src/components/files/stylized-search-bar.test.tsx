import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { useStylizedSearchBarMock } = vi.hoisted(() => ({
  useStylizedSearchBarMock: vi.fn(),
}));

vi.mock("@/components/files/use-stylized-search-bar", () => ({
  useStylizedSearchBar: useStylizedSearchBarMock,
}));

import StylizedSearchBar from "@/components/files/stylized-search-bar";

const stylizedSearchBarRuntimeFile = resolve(
  import.meta.dirname,
  "./use-stylized-search-bar.ts"
);
const removedSurfaceFile = resolve(
  import.meta.dirname,
  "./stylized-search-bar-surface.tsx"
);
const stylizedSearchBarFile = resolve(
  import.meta.dirname,
  "./stylized-search-bar.tsx"
);

describe("StylizedSearchBar", () => {
  it("wires the search runtime hook directly after removing the intermediate surface file", () => {
    const runtimeSource = readFileSync(stylizedSearchBarRuntimeFile, "utf8");
    const componentSource = readFileSync(stylizedSearchBarFile, "utf8");
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
      initialQuery: "thermo",
      items: [],
      workspaceUuid: "workspace-1",
    };

    const html = renderToStaticMarkup(<StylizedSearchBar {...props} />);

    expect(useStylizedSearchBarMock).toHaveBeenCalledWith({
      focusSignal: undefined,
      initialResults: [],
      initialQuery: "thermo",
      items: [],
      onApplyWorkspaceFilter: undefined,
      onSearch: undefined,
      workspaceUuid: "workspace-1",
    });
    expect(existsSync(removedSurfaceFile)).toBe(false);
    expect(componentSource).not.toContain(
      "@/components/files/stylized-search-bar-surface"
    );
    expect(componentSource).toContain("Searching indexed workspace content");
    expect(runtimeSource).toContain("queryWorkspaceRetrievalApi({");
    expect(runtimeSource).not.toContain("limit: 8");
    expect(html).toContain("Search anything...");
  });
});
