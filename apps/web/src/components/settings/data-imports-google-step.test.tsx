import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: ({ className }: { className?: string }) =>
    createElement("span", { className }, "spinner"),
}));

vi.mock("@/components/settings/data-imports-shared", () => ({
  DataImportsDestinationFields: () =>
    createElement("div", { "data-destination-fields": "1" }),
  ImportProviderStatusIcon: () =>
    createElement("span", { "data-status-icon": "1" }),
}));

import { DataImportsGoogleStep } from "@/components/settings/data-imports-google-step";

const destinationProps = {
  destination: null,
  destinationFolderId: "",
  destinationStatus: null,
  destinationSummaryLabel: "Workspace / Inbox",
  destinationWorkspaceId: "workspace-1",
  folderLoadFailed: false,
  folderLoading: false,
  folderOptions: [],
  hasSelectedDestination: true,
  onFolderChange: () => {},
  onWorkspaceChange: () => {},
  selectedFolder: null,
  selectedWorkspace: null,
  workspaces: [],
};

describe("DataImportsGoogleStep", () => {
  it("renders the reconnect-ready state with destination fields", () => {
    const html = renderToStaticMarkup(
      <DataImportsGoogleStep
        destinationProps={destinationProps as never}
        driveImporting={false}
        driveImportStatus="Google account connected."
        googleImportBlockedReason={null}
        onConnectGoogleDrive={() => Promise.resolve()}
        onOpenGooglePicker={() => Promise.resolve()}
        status={{
          accountId: "owner@example.com",
          configured: true,
          connected: true,
          hasRefreshToken: true,
          hasUsableAccessToken: true,
          ready: true,
          scopes: [],
        }}
      />
    );

    expect(html).toContain("Google Drive");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("Google account connected.");
    expect(html).toContain(">Reconnect<");
    expect(html).toContain('data-destination-fields="1"');
    expect(html).toContain("Import from Drive");
  });

  it("renders blocked import copy when the provider is not ready", () => {
    const html = renderToStaticMarkup(
      <DataImportsGoogleStep
        destinationProps={destinationProps as never}
        driveImporting
        driveImportStatus={null}
        googleImportBlockedReason="Choose a destination folder first."
        onConnectGoogleDrive={() => Promise.resolve()}
        onOpenGooglePicker={() => Promise.resolve()}
        status={{
          accountId: null,
          configured: true,
          connected: false,
          hasRefreshToken: false,
          hasUsableAccessToken: false,
          ready: false,
          scopes: [],
        }}
      />
    );

    expect(html).toContain("Choose a destination folder first.");
    expect(html).toContain(">Connect<");
    expect(html).not.toContain('data-destination-fields="1"');
    expect(html).toContain("spinner");
  });
});
