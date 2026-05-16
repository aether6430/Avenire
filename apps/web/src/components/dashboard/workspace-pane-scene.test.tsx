import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/dashboard/workspace-chat-new-page-client", () => ({
  WorkspaceChatNewPageClient: () => createElement("div"),
}));

vi.mock("@/components/dashboard/workspace-chat-route-page-client", () => ({
  WorkspaceChatRoutePageClient: () => createElement("div"),
}));

vi.mock("@/components/dashboard/workspace-overview-page-client", () => ({
  WorkspaceOverviewPageClient: () => createElement("div"),
}));

vi.mock("@/components/files/workspace-files-root-page-client", () => ({
  WorkspaceFilesRootPageClient: () => createElement("div"),
}));

vi.mock("@/components/files/workspace-folder-route-page-client", () => ({
  WorkspaceFolderRoutePageClient: () => createElement("div"),
}));

vi.mock("@/components/flashcards/set-detail-page", () => ({
  FlashcardSetPageClient: () => createElement("div"),
}));

vi.mock("@/components/flashcards/workspace-flashcards-page-client", () => ({
  WorkspaceFlashcardsPageClient: () => createElement("div"),
}));

vi.mock("@/components/tasks/workspace-tasks-page-client", () => ({
  WorkspaceTasksPageClient: () => createElement("div"),
}));

import { WorkspacePaneScene } from "@/components/dashboard/workspace-pane-scene";

describe("WorkspacePaneScene", () => {
  it("renders a product-facing non-loading placeholder for unsupported pane routes", () => {
    const html = renderToStaticMarkup(
      <WorkspacePaneScene
        paneId="pane-1"
        pathname="/workspace/unknown-surface"
        search=""
      />
    );

    expect(html).toContain("This workspace view isn&#x27;t available.");
    expect(html).not.toContain("Unsupported workspace route in pane");
    expect(html).not.toContain("pane-1");
  });
});
