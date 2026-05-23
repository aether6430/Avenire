import { readFileSync } from "node:fs";
import path from "node:path";
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

const workspacePaneSceneFile = path.resolve(
  import.meta.dirname,
  "./workspace-pane-scene.tsx"
);
const dashboardShellFile = path.resolve(import.meta.dirname, "./shell.tsx");
const dashboardOverlayHostFile = path.resolve(
  import.meta.dirname,
  "./dashboard-overlay-host.tsx"
);

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

  it("uses title-cased singular mindset set loading copy for the set detail route", () => {
    const source = readFileSync(workspacePaneSceneFile, "utf8");

    expect(source).toContain(
      'loading: () => <WorkspaceRoutePlaceholder label="Loading Mindset Set..." />'
    );
    expect(source).not.toContain(
      'loading: () => <WorkspaceRoutePlaceholder label="Loading mindset set..." />'
    );
  });

  it("uses title-cased Method loading copy for both workspace chat pane loaders", () => {
    const source = readFileSync(workspacePaneSceneFile, "utf8");

    expect(source.match(/Loading Method\.\.\./g)?.length).toBe(2);
    expect(source).toContain(
      'loading: () => <WorkspaceRoutePlaceholder label="Loading Method..." />'
    );
    expect(source).not.toContain(
      'loading: () => <WorkspaceRoutePlaceholder label="Loading method..." />'
    );
  });

  it("keeps settings and trash dialog ownership inside DashboardOverlayHost instead of duplicating deferred loaders in the shell", () => {
    const shellSource = readFileSync(dashboardShellFile, "utf8");
    const overlayHostSource = readFileSync(dashboardOverlayHostFile, "utf8");

    expect(shellSource).toContain("DeferredDashboardOverlayHost");
    expect(shellSource).not.toContain("DeferredSettingsDialog");
    expect(shellSource).not.toContain("DeferredTrashDialog");
    expect(overlayHostSource).toContain("DeferredSettingsDialog");
    expect(overlayHostSource).toContain("DeferredTrashDialog");
  });
});
