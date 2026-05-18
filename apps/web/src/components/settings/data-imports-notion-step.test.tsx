import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/checkbox", () => ({
  Checkbox: ({ checked }: { checked?: boolean }) =>
    createElement("span", { "data-checked": checked ? "1" : "0" }),
}));

vi.mock("@avenire/ui/components/scroll-area", () => ({
  ScrollArea: ({ children }: { children: ReactNode }) =>
    createElement("div", { "data-scroll-area": "1" }, children),
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

import { DataImportsNotionStep } from "@/components/settings/data-imports-notion-step";

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

describe("DataImportsNotionStep", () => {
  it("renders the ready state with selectable pages and destination fields", () => {
    const html = renderToStaticMarkup(
      <DataImportsNotionStep
        destinationProps={destinationProps as never}
        notionImporting={false}
        notionImportStatus="Choose pages to import."
        notionLoading={false}
        notionPages={[
          {
            id: "page-1",
            lastEditedTime: "2026-05-18T00:00:00.000Z",
            title: "Linear Algebra",
            url: "https://notion.so/page-1",
          },
        ]}
        onConnectNotion={() => Promise.resolve()}
        onImportSelectedNotionPages={() => Promise.resolve()}
        onLoadNotionPages={() => Promise.resolve()}
        onToggleNotionPage={() => {}}
        selectedNotionPageIds={["page-1"]}
        selectedPagesCount={1}
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

    expect(html).toContain("Notion");
    expect(html).toContain("owner@example.com");
    expect(html).toContain("Choose pages to import.");
    expect(html).toContain("1 of 1 selected");
    expect(html).toContain("Linear Algebra");
    expect(html).toContain("Open in Notion");
    expect(html).toContain('data-scroll-area="1"');
    expect(html).toContain('data-destination-fields="1"');
    expect(html).toContain("Import 1 page");
  });

  it("renders the empty pages state and blocked import action for zero selection", () => {
    const html = renderToStaticMarkup(
      <DataImportsNotionStep
        destinationProps={
          {
            ...destinationProps,
            hasSelectedDestination: false,
          } as never
        }
        notionImporting
        notionImportStatus={null}
        notionLoading={false}
        notionPages={[]}
        onConnectNotion={() => Promise.resolve()}
        onImportSelectedNotionPages={() => Promise.resolve()}
        onLoadNotionPages={() => Promise.resolve()}
        onToggleNotionPage={() => {}}
        selectedNotionPageIds={[]}
        selectedPagesCount={0}
        status={{
          accountId: null,
          configured: true,
          connected: false,
          hasRefreshToken: false,
          hasUsableAccessToken: false,
          ready: true,
          scopes: [],
        }}
      />
    );

    expect(html).toContain("Load pages from Notion to start a selection.");
    expect(html).toContain(">Load pages<");
    expect(html).toContain("Import selected");
    expect(html).toContain("spinner");
  });
});
