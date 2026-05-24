import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataImportsSurface } from "./settings-misc-sections";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    "aria-label": ariaLabel,
    children,
  }: {
    "aria-label"?: string;
    children?: ReactNode;
  }) => <button aria-label={ariaLabel}>{children}</button>,
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: ({ className }: { className?: string }) => (
    <span className={className}>spinner</span>
  ),
}));

vi.mock("@/components/settings/data-imports-source-picker", () => ({
  DataImportsSourcePicker: () => <div>picker</div>,
}));

const destinationRuntime = {
  googleStatus: "ready",
  loadOverview: async () => {},
  notionStatus: "ready",
  overviewLoading: false,
  overviewStatus: null,
};

describe("DataImportsSurface", () => {
  const dataImportsSurfaceSource = readFileSync(
    resolve(import.meta.dirname, "./settings-misc-sections.tsx"),
    "utf8"
  );

  it("labels icon-only back and refresh controls explicitly", () => {
    const sourceSelectedHtml = renderToStaticMarkup(
      <DataImportsSurface
        destinationRuntime={destinationRuntime as never}
        onBack={() => {}}
        onSelectSource={() => {}}
        selectedSource="google"
      />
    );
    const sourcePickerHtml = renderToStaticMarkup(
      <DataImportsSurface
        destinationRuntime={destinationRuntime as never}
        onBack={() => {}}
        onSelectSource={() => {}}
        selectedSource={null}
      />
    );

    expect(sourceSelectedHtml).toContain('aria-label="Back to import sources"');
    expect(sourceSelectedHtml).toContain(
      'aria-label="Refresh import overview"'
    );
    expect(sourcePickerHtml).not.toContain(
      'aria-label="Back to import sources"'
    );
    expect(sourcePickerHtml).toContain('aria-label="Refresh import overview"');
    expect(dataImportsSurfaceSource).toContain(
      'import("@/components/settings/data-imports-google-step")'
    );
    expect(dataImportsSurfaceSource).toContain(
      'import("@/components/settings/data-imports-notion-step")'
    );
    expect(dataImportsSurfaceSource).toContain(
      'from "@/components/settings/data-imports-source-picker"'
    );
    expect(dataImportsSurfaceSource).not.toContain(
      'from "@/components/settings/use-data-imports-google"'
    );
    expect(dataImportsSurfaceSource).not.toContain(
      'from "@/components/settings/use-data-imports-notion"'
    );
    expect(dataImportsSurfaceSource).not.toContain(
      'from "@/components/settings/data-imports-client"'
    );
  });
});
