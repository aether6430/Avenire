import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { type ComponentProps, createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES,
  EXPLORER_MAX_VISIBLE_CARD_PROPERTIES,
  EXPLORER_SORT_BUILTIN_OPTIONS,
  getExplorerSortDirectionLabel,
  getExplorerSortFieldLabel,
} from "@/components/files/explorer/explorer-controls-model";
import { ExplorerControlsPrimarySection } from "@/components/files/explorer/explorer-controls-primary-section";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    children,
    ...props
  }: ComponentProps<"button"> & { children?: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("./explorer-create-menu", () => ({
  ExplorerCreateMenu: () =>
    createElement("div", { "data-create-menu": "1" }, "create"),
}));

const controlsSource = readFileSync(
  resolve(import.meta.dirname, "./explorer-controls.tsx"),
  "utf8"
);
const primarySectionSource = readFileSync(
  resolve(import.meta.dirname, "./explorer-controls-primary-section.tsx"),
  "utf8"
);
const secondarySectionSource = readFileSync(
  resolve(import.meta.dirname, "./explorer-controls-secondary-section.tsx"),
  "utf8"
);

describe("explorer-controls-model", () => {
  it("exposes stable card field limits", () => {
    expect(EXPLORER_MAX_VISIBLE_CARD_PROPERTIES).toBe(4);
    expect(EXPLORER_DEFAULT_VISIBLE_CARD_PROPERTIES).toBe(3);
  });

  it("exposes the built-in sort options in display order", () => {
    expect(EXPLORER_SORT_BUILTIN_OPTIONS).toEqual([
      { key: "name", label: "Name" },
      { key: "createdAt", label: "Date created" },
      { key: "updatedAt", label: "Date updated" },
    ]);
  });

  it("formats sort field and direction labels for builtin and property sorts", () => {
    expect(
      getExplorerSortFieldLabel({
        direction: "asc",
        key: "name",
        kind: "builtin",
      })
    ).toBe("Name");
    expect(
      getExplorerSortFieldLabel({
        direction: "desc",
        key: "priority",
        kind: "property",
        type: "number",
      })
    ).toBe("priority");
    expect(getExplorerSortDirectionLabel("asc")).toBe("Asc");
    expect(getExplorerSortDirectionLabel("desc")).toBe("Desc");
  });

  it("stacks the primary and secondary bands cleanly on ultra-narrow widths", () => {
    expect(controlsSource).toContain("max-[340px]:items-stretch");
    expect(controlsSource).toContain("max-[340px]:justify-start");
    expect(controlsSource).toContain("max-[340px]:gap-y-2");
    expect(secondarySectionSource).toContain("max-[340px]:w-full");
    expect(secondarySectionSource).toContain("max-[340px]:gap-y-2");
  });

  it("allows the mobile location title to wrap instead of hard truncating", () => {
    const html = renderToStaticMarkup(
      createElement(ExplorerControlsPrimarySection, {
        canNavigateUp: false,
        canRedoFileOperation: false,
        canUndoFileOperation: false,
        currentFolderId: "folder-1",
        currentLocationTitle: "UX QA 2026-05-21 C's Workspace",
        fileOperationHistoryBusy: false,
        isCurrentFolderReadOnly: false,
        isMobile: true,
        menuSurfaceClass: "",
        onCreateFolder: () => {},
        onCreateNote: () => {},
        onImportLink: () => {},
        onNavigateUp: () => {},
        onOpenMobileCreateMenu: () => {},
        onRedo: () => {},
        onUndo: () => {},
        onUploadFile: () => {},
        onUploadFolder: () => {},
      })
    );

    expect(html).toContain("UX QA 2026-05-21 C&#x27;s Workspace");
    expect(primarySectionSource).toContain("max-[340px]:w-full");
    expect(primarySectionSource).toContain("max-[340px]:flex-wrap");
    expect(primarySectionSource).toContain("max-[340px]:order-3");
    expect(primarySectionSource).toContain("max-[340px]:ml-auto");
    expect(primarySectionSource).toContain("max-[340px]:gap-y-2");
    expect(primarySectionSource).toContain("line-clamp-2");
    expect(primarySectionSource).toContain("max-[340px]:text-[1.2rem]");
    expect(primarySectionSource).toContain("max-[340px]:leading-snug");
    expect(primarySectionSource).toContain("sm:truncate");
    expect(primarySectionSource).not.toContain(
      'className="truncate font-semibold text-[1.9rem] tracking-tight"'
    );
  });
});
