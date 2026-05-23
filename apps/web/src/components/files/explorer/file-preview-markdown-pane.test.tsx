import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { FilePreviewMarkdownPaneSurfaceMock } = vi.hoisted(() => ({
  FilePreviewMarkdownPaneSurfaceMock: vi.fn(() => (
    <div>MARKDOWN_PANE_SURFACE</div>
  )),
}));

vi.mock(
  "@/components/files/explorer/file-preview-markdown-pane-surface",
  () => ({
    FilePreviewMarkdownPaneSurface: FilePreviewMarkdownPaneSurfaceMock,
  })
);

import { FilePreviewPanelSurface } from "@/components/files/explorer/file-preview-panel-surface";

const filePreviewPanelSurfaceFile = resolve(
  import.meta.dirname,
  "./file-preview-panel-surface.tsx"
);
const removedWrapperFile = resolve(
  import.meta.dirname,
  "./file-preview-markdown-pane.tsx"
);

describe("FilePreview markdown branch", () => {
  it("keeps markdown-pane ownership in FilePreviewPanelSurface without the old wrapper file", () => {
    const source = readFileSync(filePreviewPanelSurfaceFile, "utf8");
    const html = renderToStaticMarkup(
      <FilePreviewPanelSurface
        runtime={
          {
            activeFile: {
              id: "file-1",
              name: "notes.md",
              readOnly: false,
            },
            activeFileIsMarkdown: true,
            allFiles: [],
            applyDefaultNoteCover: () => {},
            currentUser: { email: "ada@avenire.local", name: "Ada" },
            derivedState: { isMarkdown: true },
            filePreviewScrollRef: { current: null },
            filePreviewSearchText: "",
            handleMarkdownBodyChange: () => {},
            isMarkdownReady: true,
            markdownBody: "# Notes",
            markdownError: null,
            markdownLoading: false,
            mediaModel: null,
            noteBannerInputRef: { current: null },
            noteBannerUploadBusy: false,
            noteBannerUrl: null,
            noteCoverLinkDraft: "",
            noteCoverPickerTab: "gallery",
            noteDisplayTitle: "Lecture Notes",
            notePage: { properties: {} },
            noteSaveState: "saved",
            openFileById: () => {},
            openPane: () => {},
            paneId: "pane-1",
            propertiesOpen: false,
            propertyDefinitions: [],
            query: "",
            setAudioLoadFailed: () => {},
            setNoteCoverLinkDraft: () => {},
            setNoteCoverPickerTab: () => {},
            setNotePage: () => {},
            setPropertiesOpen: () => {},
            setPropertyDefinitions: () => {},
            setSetNoteCoverUrl: undefined,
            setVideoLoadFailed: () => {},
            setNoteCoverUrl: () => {},
            triggerNoteBannerPicker: () => {},
            wikiLinkableFiles: [],
            workspaceUuid: "workspace-1",
          } as never
        }
      />
    );

    expect(source).toContain('from "./file-preview-markdown-pane-surface"');
    expect(source).not.toContain('from "./file-preview-markdown-pane"');
    expect(FilePreviewMarkdownPaneSurfaceMock).toHaveBeenCalledTimes(1);
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(html).toContain("MARKDOWN_PANE_SURFACE");
  });
});
