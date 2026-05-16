import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SidebarFilesPanelActionsSection } from "./sidebar-files-panel-actions-section";

vi.mock("@avenire/ui/components/sidebar", () => ({
  SidebarGroup: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SidebarGroupContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/components/dashboard/dashboard-sidebar-shared", () => ({
  SectionButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
  SectionHeader: ({
    actions,
    title,
  }: {
    actions: ReactNode;
    title: string;
  }) => (
    <section>
      <h2>{title}</h2>
      <div>{actions}</div>
    </section>
  ),
  SectionIconAction: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

describe("SidebarFilesPanelActionsSection", () => {
  it("uses local files search language alongside note and link actions", () => {
    const html = renderToStaticMarkup(
      <SidebarFilesPanelActionsSection
        createNewNote={() => {}}
        importLink={() => {}}
        onToggleSearch={() => {}}
      />
    );

    expect(html).toContain("Search Files");
    expect(html).toContain("New Note");
    expect(html).toContain("Import Link");
    expect(html).not.toContain("Search Workspace");
  });
});
