import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { DataImportsSurface } from "./data-imports-surface";

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
  });
});
