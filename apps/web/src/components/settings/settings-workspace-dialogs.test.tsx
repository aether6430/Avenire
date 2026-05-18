import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { editorMock, useSettingsWorkspaceNoteTemplateDialogMock } = vi.hoisted(
  () => ({
    editorMock: vi.fn(() =>
      createElement("div", { "data-note-template-editor": "1" })
    ),
    useSettingsWorkspaceNoteTemplateDialogMock: vi.fn(),
  })
);

vi.mock("next/dynamic", () => ({
  default: () => editorMock,
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/dialog", () => ({
  Dialog: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogContent: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogDescription: ({ children }: { children: ReactNode }) =>
    createElement("p", null, children),
  DialogFooter: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogHeader: ({ children }: { children: ReactNode }) =>
    createElement("div", null, children),
  DialogTitle: ({ children }: { children: ReactNode }) =>
    createElement("h2", null, children),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => createElement("input", props),
}));

vi.mock("./use-settings-workspace-note-template-dialog", () => ({
  useSettingsWorkspaceNoteTemplateDialog:
    useSettingsWorkspaceNoteTemplateDialogMock,
}));

import { SettingsWorkspaceDialogs } from "@/components/settings/settings-workspace-dialogs";

describe("SettingsWorkspaceDialogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSettingsWorkspaceNoteTemplateDialogMock.mockReturnValue({
      handleNoteTemplateBannerFileChange: async () => {},
      noteTemplateBannerInputRef: { current: null },
      noteTemplateBannerStatus: null,
      noteTemplateBannerUploading: false,
      noteTemplateBannerUrl: "",
      noteTemplateDraft: {
        bannerUrl: null,
        content: "",
        id: "",
        name: "",
      },
      noteTemplateEditorKey: "editor-1",
      noteTemplateEditorScrollRef: { current: null },
      setNoteTemplateBannerStatus: () => {},
      setNoteTemplateBannerUrl: () => {},
      setNoteTemplateDraft: () => {},
    });
  });

  it("renders the new-template dialog state with disabled save and no delete action", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceDialogs
        activeWorkspaceId="workspace-1"
        currentUserEmail="owner@example.com"
        initialTemplate={null}
        noteTemplates={[]}
        onOpenChange={() => {}}
        open
        selectedWorkspace={{
          name: "Aveniri",
          organizationId: "org-1",
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        }}
        session={{ user: { email: "owner@example.com", name: "Owner" } }}
        setNoteTemplates={() => {}}
      />
    );

    expect(html).toContain("New template");
    expect(html).toContain("Templates are stored per workspace");
    expect(html).toContain('placeholder="Study note"');
    expect(html).toContain('placeholder="https://example.com/banner.png"');
    expect(html).toContain(">Upload banner<");
    expect(html).toContain(">Cancel<");
    expect(html).toContain(">Save template<");
    expect(html).toContain('disabled=""');
    expect(html).not.toContain(">Delete<");
    expect(html).toContain('data-note-template-editor="1"');
  });

  it("renders the edit-template dialog state with banner preview, delete action, and upload status", () => {
    useSettingsWorkspaceNoteTemplateDialogMock.mockReturnValue({
      handleNoteTemplateBannerFileChange: async () => {},
      noteTemplateBannerInputRef: { current: null },
      noteTemplateBannerStatus: "Banner uploaded.",
      noteTemplateBannerUploading: true,
      noteTemplateBannerUrl: "https://cdn.avenire.app/banner.png",
      noteTemplateDraft: {
        bannerUrl: "https://cdn.avenire.app/banner.png",
        content: "# Research",
        id: "template-1",
        name: "Research note",
      },
      noteTemplateEditorKey: "editor-2",
      noteTemplateEditorScrollRef: { current: null },
      setNoteTemplateBannerStatus: () => {},
      setNoteTemplateBannerUrl: () => {},
      setNoteTemplateDraft: () => {},
    });

    const html = renderToStaticMarkup(
      <SettingsWorkspaceDialogs
        activeWorkspaceId="workspace-1"
        currentUserEmail="owner@example.com"
        initialTemplate={{
          bannerUrl: "https://cdn.avenire.app/banner.png",
          content: "# Research",
          id: "template-1",
          name: "Research note",
        }}
        noteTemplates={[]}
        onOpenChange={() => {}}
        open
        selectedWorkspace={{
          name: "Aveniri",
          organizationId: "org-1",
          rootFolderId: "root-1",
          workspaceId: "workspace-1",
        }}
        session={{ user: { email: "owner@example.com", name: "Owner" } }}
        setNoteTemplates={() => {}}
      />
    );

    expect(html).toContain("Edit template");
    expect(html).toContain('value="Research note"');
    expect(html).toContain('value="https://cdn.avenire.app/banner.png"');
    expect(html).toContain("Uploading...");
    expect(html).toContain("Banner uploaded.");
    expect(html).toContain(">Remove<");
    expect(html).toContain(">Delete<");
    expect(html).toContain(
      "background-image:url(https://cdn.avenire.app/banner.png)"
    );
    expect(html).toContain('data-note-template-editor="1"');
  });
});
