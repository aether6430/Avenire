import type { ComponentProps, ReactElement, ReactNode } from "react";
import { cloneElement, createRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { FilePreviewMarkdownPane } from "@/components/files/explorer/file-preview-markdown-pane";

vi.mock("@/components/files/explorer/file-preview-markdown-content", () => ({
  FilePreviewMarkdownContent: ({
    isPaneActive,
    markdownBody,
    noteDisplayTitle,
  }: {
    isPaneActive: boolean;
    markdownBody: string;
    noteDisplayTitle: string;
  }) => (
    <section data-markdown-content={isPaneActive ? "active" : "inactive"}>
      {noteDisplayTitle}:{markdownBody}
    </section>
  ),
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: { alt: string; src: string }) => (
    <span aria-label={alt} data-image-src={src} role="img" />
  ),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({
    children,
    ...props
  }: {
    children?: ReactNode;
  } & Record<string, unknown>) => (
    <button
      aria-label={props["aria-label"] as string | undefined}
      className={props.className as string | undefined}
      disabled={props.disabled as boolean | undefined}
      type={
        (props.type as "button" | "submit" | "reset" | undefined) ?? "button"
      }
    >
      {children}
    </button>
  ),
}));

vi.mock("@avenire/ui/components/button-group", () => ({
  ButtonGroup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@avenire/ui/components/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({
    children,
    render,
  }: {
    children: ReactNode;
    render?: ReactElement;
  }) =>
    render ? (
      cloneElement(render, undefined, children)
    ) : (
      <button>{children}</button>
    ),
}));

vi.mock("@avenire/ui/components/spinner", () => ({
  Spinner: () => <span data-spinner="true" />,
}));

vi.mock("@avenire/ui/components/tabs", () => ({
  Tabs: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsList: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({
    children,
    value,
  }: {
    children: ReactNode;
    value: string;
  }) => (
    <button type="button" value={value}>
      {children}
    </button>
  ),
}));

type MarkdownPaneProps = ComponentProps<typeof FilePreviewMarkdownPane>;

function createProps(
  overrides: Partial<MarkdownPaneProps> = {}
): MarkdownPaneProps {
  return {
    activeFileId: "file_1",
    activeFileIsMarkdown: true,
    activeFileName: "Lecture Notes.md",
    editorCreatedBy: "user_1",
    isMarkdownReady: true,
    isPaneActive: false,
    markdownBody: "# Linear algebra",
    markdownError: null,
    markdownLoading: false,
    noteBannerUploadBusy: false,
    noteBannerUrl: null,
    noteCoverLinkDraft: "",
    noteCoverPickerTab: "gallery",
    noteDisplayTitle: "Lecture Notes",
    noteSaveState: "idle",
    onApplyDefaultNoteCover: vi.fn(),
    onMarkdownBodyChange: vi.fn(),
    onNoteCoverLinkDraftChange: vi.fn(),
    onNoteCoverPickerTabChange: vi.fn(),
    onOpenWikiLink: vi.fn(),
    onSetNoteCoverUrl: vi.fn(),
    onTemplateApplied: vi.fn(),
    onTriggerNoteBannerPicker: vi.fn(),
    scrollContainerRef: createRef<HTMLDivElement>(),
    wikiPages: [],
    workspaceUuid: "workspace_1",
    ...overrides,
  };
}

describe("FilePreviewMarkdownPane", () => {
  it("renders loading and error states before mounting note controls", () => {
    const loadingHtml = renderToStaticMarkup(
      <FilePreviewMarkdownPane {...createProps({ markdownLoading: true })} />
    );
    const errorHtml = renderToStaticMarkup(
      <FilePreviewMarkdownPane
        {...createProps({ markdownError: "Unable to load markdown." })}
      />
    );

    expect(loadingHtml).toContain("Loading markdown...");
    expect(loadingHtml).not.toContain("Add cover");
    expect(errorHtml).toContain("Unable to load markdown.");
    expect(errorHtml).not.toContain("Add cover");
  });

  it("renders inactive markdown preview and the empty cover affordance", () => {
    const html = renderToStaticMarkup(
      <FilePreviewMarkdownPane {...createProps()} />
    );

    expect(html).toContain("Add cover");
    expect(html).toContain("# Linear algebra");
    expect(html).toContain('data-markdown-content="inactive"');
  });

  it("renders cover controls and editor content for an active note with a banner", () => {
    const html = renderToStaticMarkup(
      <FilePreviewMarkdownPane
        {...createProps({
          isPaneActive: true,
          noteBannerUrl: "https://example.com/cover.png",
          noteCoverLinkDraft: "https://example.com/next.png",
          noteCoverPickerTab: "link",
        })}
      />
    );

    expect(html).toContain("Lecture Notes.md cover");
    expect(html).toContain("Change");
    expect(html).toContain("Upload");
    expect(html).toContain("Remove");
    expect(html).toContain("Apply cover");
    expect(html).toContain('data-markdown-content="active"');
  });
});
