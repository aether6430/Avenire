import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { settingsPanelMock } = vi.hoisted(() => ({
  settingsPanelMock: vi.fn(() =>
    createElement("div", { "data-settings-panel": "1" })
  ),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-dialog": "1" }, children),
  DialogContent: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-dialog-content": "1" }, children),
  DialogHeader: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-dialog-header": "1" }, children),
  DialogTitle: ({ children }: { children: ReactNode }) =>
    createElement("h2", { "data-dialog-title": "1" }, children),
}));

vi.mock("@/components/settings/settings-panel", () => ({
  SettingsPanel: settingsPanelMock,
}));

import { SettingsDialog } from "@/components/settings/settings-dialog";

describe("SettingsDialog", () => {
  it("renders the settings dialog shell and forwards initial tab/workspace props to the panel", () => {
    const workspaces = [
      {
        logo: null,
        name: "Aveniri",
        organizationId: "org-1",
        rootFolderId: "root-1",
        workspaceId: "workspace-1",
      },
    ];
    const html = renderToStaticMarkup(
      <SettingsDialog
        initialTab="billing"
        initialWorkspaceId="workspace-1"
        initialWorkspaces={workspaces}
        onOpenChange={() => {}}
        open
      />
    );

    expect(settingsPanelMock).toHaveBeenCalledWith(
      {
        initialTab: "billing",
        initialWorkspaceId: "workspace-1",
        initialWorkspaces: workspaces,
      },
      undefined
    );
    expect(html).toContain('data-dialog="1"');
    expect(html).toContain('data-dialog-content="1"');
    expect(html).toContain('data-dialog-title="1"');
    expect(html).toContain("Settings");
    expect(html).toContain('data-settings-panel="1"');
  });
});
