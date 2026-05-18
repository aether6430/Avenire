import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { dataImportsSurfaceMock, useDataImportsMock } = vi.hoisted(() => ({
  dataImportsSurfaceMock: vi.fn(() =>
    createElement("div", { "data-imports-surface": "1" })
  ),
  useDataImportsMock: vi.fn(),
}));

vi.mock("@/components/settings/data-imports-surface", () => ({
  DataImportsSurface: dataImportsSurfaceMock,
}));

vi.mock("@/components/settings/use-data-imports", () => ({
  useDataImports: useDataImportsMock,
}));

import { DataImportsSection } from "@/components/settings/data-imports-section";

describe("DataImportsSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataImportsMock.mockReturnValue({
      destinationRuntime: {
        googleStatus: null,
        hasSelectedDestination: false,
        loadOverview: async () => {},
        notionStatus: null,
        overviewLoading: false,
        overviewStatus: null,
      },
      onBack: () => {},
      onSelectSource: () => {},
      selectedSource: null,
    });
  });

  it("routes workspaces through the data-imports hook and visible surface", () => {
    const workspaces = [
      {
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];

    const html = renderToStaticMarkup(
      <DataImportsSection workspaces={workspaces} />
    );

    expect(useDataImportsMock).toHaveBeenCalledWith({ workspaces });
    expect(dataImportsSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedSource: null,
      }),
      undefined
    );
    expect(html).toContain('data-imports-surface="1"');
  });
});
