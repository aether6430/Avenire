import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  dataImportsGoogleStepMock,
  dataImportsNotionStepMock,
  useDataImportsGoogleMock,
  useDataImportsNotionMock,
} = vi.hoisted(() => ({
  dataImportsGoogleStepMock: vi.fn(() =>
    createElement("div", { "data-google-step": "1" })
  ),
  dataImportsNotionStepMock: vi.fn(() =>
    createElement("div", { "data-notion-step": "1" })
  ),
  useDataImportsGoogleMock: vi.fn(),
  useDataImportsNotionMock: vi.fn(),
}));

vi.mock("@/components/settings/data-imports-google-step", () => ({
  DataImportsGoogleStep: dataImportsGoogleStepMock,
}));

vi.mock("@/components/settings/data-imports-notion-step", () => ({
  DataImportsNotionStep: dataImportsNotionStepMock,
}));

vi.mock("@/components/settings/use-data-imports-google", () => ({
  useDataImportsGoogle: useDataImportsGoogleMock,
}));

vi.mock("@/components/settings/use-data-imports-notion", () => ({
  useDataImportsNotion: useDataImportsNotionMock,
}));

import { DataImportsGoogleStepShell } from "@/components/settings/data-imports-google-step-shell";
import { DataImportsNotionStepShell } from "@/components/settings/data-imports-notion-step-shell";

describe("data imports step shells", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useDataImportsGoogleMock.mockReturnValue({
      connectGoogleDrive: async () => {},
      driveImporting: false,
      driveImportStatus: "Google account connected.",
      googleImportBlockedReason: null,
      handleOpenGooglePicker: async () => {},
    });
    useDataImportsNotionMock.mockReturnValue({
      connectNotion: async () => {},
      handleImportSelectedNotionPages: async () => {},
      handleLoadNotionPages: async () => {},
      notionImporting: false,
      notionImportStatus: "Choose pages to import.",
      notionLoading: false,
      notionPages: [],
      selectedNotionPageIds: [],
      selectedPagesCount: 0,
      toggleNotionPage: () => {},
    });
  });

  it("composes destination runtime into the Google and Notion step shells", () => {
    const destinationRuntime = {
      destinationProps: { hasSelectedDestination: true },
      ensureSavedDestination: async () => null,
      googleStatus: { ready: true },
      hasSelectedDestination: true,
      loadOverview: async () => {},
      notionStatus: { ready: false },
      overviewLoading: false,
      overviewStatus: null,
    } as never;

    const googleHtml = renderToStaticMarkup(
      <DataImportsGoogleStepShell destinationRuntime={destinationRuntime} />
    );
    const notionHtml = renderToStaticMarkup(
      <DataImportsNotionStepShell destinationRuntime={destinationRuntime} />
    );

    expect(useDataImportsGoogleMock).toHaveBeenCalledWith({
      ensureSavedDestination: destinationRuntime.ensureSavedDestination,
      googleStatus: destinationRuntime.googleStatus,
      hasSelectedDestination: destinationRuntime.hasSelectedDestination,
      loadOverview: destinationRuntime.loadOverview,
      pickerApiKey: "",
      pickerAppId: "",
    });
    expect(useDataImportsNotionMock).toHaveBeenCalledWith({
      ensureSavedDestination: destinationRuntime.ensureSavedDestination,
      loadOverview: destinationRuntime.loadOverview,
      notionStatus: destinationRuntime.notionStatus,
    });
    expect(googleHtml).toContain('data-google-step="1"');
    expect(notionHtml).toContain('data-notion-step="1"');
  });
});
