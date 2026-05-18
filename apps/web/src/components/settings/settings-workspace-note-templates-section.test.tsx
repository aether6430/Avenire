import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsWorkspaceNoteTemplatesSection } from "@/components/settings/settings-workspace-note-templates-section";
import { DEFAULT_NOTE_TEMPLATE } from "@/lib/note-templates";

vi.mock("@avenire/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

describe("SettingsWorkspaceNoteTemplatesSection", () => {
  it("renders an explicit empty state when no note templates exist", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceNoteTemplatesSection
        noteTemplates={[]}
        openNoteTemplateEditor={() => {}}
        setNoteTemplates={() => {}}
      />
    );

    expect(html).toContain("No note templates yet.");
    expect(html).toContain("Create one to reuse structure across notes.");
    expect(html).toContain(">New template<");
  });

  it("renders template cards and only offers delete for non-default templates", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceNoteTemplatesSection
        noteTemplates={[
          {
            bannerUrl: null,
            content: "# Default",
            id: DEFAULT_NOTE_TEMPLATE.id,
            name: "Default note",
          },
          {
            bannerUrl: "https://cdn.avenire.app/banner.png",
            content: "# Research",
            id: "custom-1",
            name: "Research note",
          },
        ]}
        openNoteTemplateEditor={() => {}}
        setNoteTemplates={() => {}}
      />
    );

    expect(html).toContain("Default note");
    expect(html).toContain("Research note");
    expect(html).toContain("Template banner enabled");
    expect(html).toContain("Markdown template");
    expect(html).toContain(">Edit<");
    expect(html.match(/>Delete</g)?.length).toBe(1);
  });
});
