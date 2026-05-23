import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  const googleStepShellSource = readFileSync(
    resolve(import.meta.dirname, "./data-imports-google-step-shell.tsx"),
    "utf8"
  );
  const notionStepShellSource = readFileSync(
    resolve(import.meta.dirname, "./data-imports-notion-step-shell.tsx"),
    "utf8"
  );

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
    expect(googleStepShellSource).toContain(
      'from "@/components/settings/data-imports-google-step"'
    );
    expect(googleStepShellSource).toContain(
      'from "@/components/settings/use-data-imports-google"'
    );
    expect(googleStepShellSource).toContain(
      "NEXT_PUBLIC_GOOGLE_PICKER_API_KEY"
    );
    expect(googleStepShellSource).toContain("NEXT_PUBLIC_GOOGLE_PICKER_APP_ID");
    expect(googleStepShellSource).not.toContain("loadGooglePickerToken(");
    expect(googleStepShellSource).not.toContain("linkSocial(");
    expect(notionStepShellSource).toContain(
      'from "@/components/settings/data-imports-notion-step"'
    );
    expect(notionStepShellSource).toContain(
      'from "@/components/settings/use-data-imports-notion"'
    );
    expect(notionStepShellSource).not.toContain("loadNotionImportPages(");
    expect(notionStepShellSource).not.toContain("linkSocial(");
  });
});
