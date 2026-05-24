import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  SettingsDataSection,
  SettingsShortcutsSection,
} from "@/components/settings/settings-misc-sections";

vi.mock("next/dynamic", () => ({
  default: () => () => null,
}));

vi.mock("@/components/settings/use-data-imports", () => ({
  useDataImports: () => ({
    destinationRuntime: {},
    onBack: () => {},
    onSelectSource: () => {},
    selectedSource: null,
  }),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => createElement("input", props),
}));

vi.mock("@avenire/ui/components/kbd", () => ({
  Kbd: ({ children }: { children: ReactNode }) =>
    createElement("kbd", null, children),
  KbdGroup: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
}));

describe("settings misc sections", () => {
  const settingsMiscSectionsSource = readFileSync(
    resolve(import.meta.dirname, "./settings-misc-sections.tsx"),
    "utf8"
  );
  const settingsPanelContentSource = readFileSync(
    resolve(import.meta.dirname, "./settings-panel-content.tsx"),
    "utf8"
  );
  const removedShortcutsWrapperFile = resolve(
    import.meta.dirname,
    "./settings-shortcuts-tab-shell.tsx"
  );

  it("renders the data imports and retention surface", () => {
    const html = renderToStaticMarkup(
      <SettingsDataSection
        runtime={{} as never}
        workspaces={[
          {
            name: "Aveniri",
            organizationId: "org-1",
            rootFolderId: "root-1",
            workspaceId: "workspace-1",
          },
        ]}
      />
    );

    expect(html).toContain("Data Imports");
    expect(html).toContain("Select a source to get started");
    expect(html).toContain("Data Retention");
    expect(html).toContain("Deleted files and folders are moved to Trash");
    expect(settingsMiscSectionsSource).toContain(
      "export function DataImportsSurface"
    );
    expect(settingsMiscSectionsSource).toContain(
      'from "@/components/settings/use-data-imports"'
    );
    expect(settingsMiscSectionsSource).not.toContain(
      'from "@/components/settings/data-imports-surface"'
    );
  });

  it("renders the explicit empty shortcuts search state", () => {
    const html = renderToStaticMarkup(
      <SettingsShortcutsSection
        filteredShortcutCount={0}
        filteredShortcutGroups={[]}
        setShortcutQuery={() => {}}
        shortcutQuery="vim"
      />
    );

    expect(html).toContain("Keyboard Shortcuts");
    expect(html).toContain("Search shortcuts");
    expect(html).toContain("0 total");
    expect(html).toContain("No shortcuts match that search.");
  });

  it("renders grouped shortcut rows when matches exist", () => {
    const html = renderToStaticMarkup(
      <SettingsShortcutsSection
        filteredShortcutCount={2}
        filteredShortcutGroups={[
          {
            items: [
              {
                keys: ["Cmd", "K"],
                label: "Open command palette",
              },
              {
                keys: ["Cmd", "B"],
                label: "Toggle sidebar",
              },
            ],
            name: "Workspace",
          },
        ]}
        setShortcutQuery={() => {}}
        shortcutQuery=""
      />
    );

    expect(html).toContain("Workspace");
    expect(html).toContain("Open command palette");
    expect(html).toContain("Toggle sidebar");
    expect(html).toContain(">Cmd<");
    expect(html).toContain(">K<");
    expect(html).toContain(">B<");
  });

  it("keeps shortcuts composition in settings-panel-content without the old tab-shell wrapper file", () => {
    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/settings-misc-sections"'
    );
    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/use-settings-panel-shortcuts"'
    );
    expect(settingsPanelContentSource).toContain("useSettingsPanelShortcuts()");
    expect(settingsPanelContentSource).not.toContain(
      "function ReadySettingsShortcutsSection"
    );
    expect(settingsPanelContentSource).not.toContain(
      'from "@/components/settings/settings-shortcuts-tab-shell"'
    );
    expect(existsSync(removedShortcutsWrapperFile)).toBe(false);
  });
});
