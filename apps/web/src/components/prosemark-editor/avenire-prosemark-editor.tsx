"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { markdown } from "@codemirror/lang-markdown";
import {
  forceParsing,
  HighlightStyle,
  syntaxHighlighting,
} from "@codemirror/language";
import { languages } from "@codemirror/language-data";
import { search } from "@codemirror/search";
import {
  Compartment,
  EditorState,
  type Extension,
  Prec,
} from "@codemirror/state";
import {
  drawSelection,
  EditorView,
  keymap,
  ViewPlugin,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { GFM } from "@lezer/markdown";
import {
  prosemarkBaseThemeSetup,
  prosemarkBasicSetup,
  prosemarkMarkdownSyntaxExtensions,
} from "@prosemark/core";
import {
  memo,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  isMarkdownNoteTemplateTargetEmpty,
  renderMarkdownNoteTemplate,
} from "@/lib/markdown-note-template";
import {
  getDefaultNoteTemplates,
  getNoteTemplateStorageKey,
  getRecentNoteTemplateStorageKey,
  type NoteTemplate,
} from "@/lib/note-templates";
import {
  NOTE_WIDGET_INSERT_EVENT,
  type NoteWidgetPayload,
  serializeNoteWidgetPayload,
} from "@/lib/note-widgets";
import { useUploadThing } from "@/lib/uploadthing";
import {
  parseMarkdownDocument,
  serializeMarkdownDocument,
} from "./frontmatter";
import { FrontmatterPanel } from "./frontmatter-panel";
import {
  htmlBlockDecorations,
  htmlBlockParserExtension,
} from "./html-block-decorations";
import { imageDecorations } from "./image-decorations";
import { latexDecorations } from "./latex-decorations";
import { markdownFormatting } from "./markdown-formatting";
import { mermaidDecorations } from "./mermaid-decorations";
import { noteWidgetDecorations } from "./note-widget-decorations";
import { tableDecorations } from "./table-decorations";
import {
  type ProsemarkWikiOpenOptions,
  type ProsemarkWikiPage,
  wikiLinkExtension,
} from "./wiki-link-extension";
import "./prosemark-theme.css";

interface AvenireProsemarkEditorProps {
  createdBy?: string;
  defaultValue: string;
  noteTitle?: string;
  onChange: (markdown: string) => void;
  onOpenWikiLink?: (
    page: ProsemarkWikiPage,
    options: ProsemarkWikiOpenOptions
  ) => void;
  onTemplateApplied?: (template: NoteTemplate, rendered: string) => void;
  saveMessage?: string;
  saveState?: "idle" | "saving" | "saved" | "error";
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  wikiPages: ProsemarkWikiPage[];
  workspaceUuid?: string;
}

const VIEWPORT_OVERSHOOT = 2000;
const VIEWPORT_PARSE_BUDGET_MS = 50;
const IDLE_PARSE_BUDGET_MS = 50;
const IDLE_PARSE_TIMEOUT_MS = 2000;

function loadWorkspaceNoteTemplates(workspaceUuid: string | undefined) {
  if (!workspaceUuid) {
    return getDefaultNoteTemplates();
  }

  try {
    const raw = window.localStorage.getItem(
      getNoteTemplateStorageKey(workspaceUuid)
    );
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) {
      return getDefaultNoteTemplates();
    }
    const templates = parsed
      .map((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
          return null;
        }
        const candidate = entry as Partial<NoteTemplate>;
        const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
        const name =
          typeof candidate.name === "string" ? candidate.name.trim() : "";
        const content =
          typeof candidate.content === "string" ? candidate.content : "";
        const bannerUrl =
          typeof candidate.bannerUrl === "string" &&
          candidate.bannerUrl.trim().length > 0
            ? candidate.bannerUrl.trim()
            : null;
        return id && name && content ? { bannerUrl, content, id, name } : null;
      })
      .filter((entry): entry is NoteTemplate => Boolean(entry));

    return templates.length > 0 ? templates : getDefaultNoteTemplates();
  } catch {
    return getDefaultNoteTemplates();
  }
}

function loadRecentTemplateIds(workspaceUuid: string | undefined) {
  if (!workspaceUuid) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(
      getRecentNoteTemplateStorageKey(workspaceUuid)
    );
    const parsed = JSON.parse(raw ?? "[]") as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry): entry is string => typeof entry === "string")
      .slice(0, 6);
  } catch {
    return [];
  }
}

function persistRecentTemplate(
  workspaceUuid: string | undefined,
  templateId: string
) {
  if (!workspaceUuid) {
    return;
  }

  try {
    const existing = loadRecentTemplateIds(workspaceUuid).filter(
      (entry) => entry !== templateId
    );
    window.localStorage.setItem(
      getRecentNoteTemplateStorageKey(workspaceUuid),
      JSON.stringify([templateId, ...existing].slice(0, 6))
    );
  } catch {
    return;
  }
}

function invisibleSearchPanel() {
  const dom = document.createElement("div");
  dom.style.display = "none";
  return { dom };
}

function advanceViewportParse(view: EditorView, isDisposed: () => boolean) {
  const viewport = view.viewport;
  const target = Math.min(
    view.state.doc.length,
    viewport.to + VIEWPORT_OVERSHOOT
  );
  forceParsing(view, target, VIEWPORT_PARSE_BUDGET_MS);

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(
      () => {
        if (isDisposed()) {
          return;
        }
        forceParsing(view, view.state.doc.length, IDLE_PARSE_BUDGET_MS);
      },
      { timeout: IDLE_PARSE_TIMEOUT_MS }
    );
  }
}

function focusOnRevealExtension(isDisposed: () => boolean): Extension {
  return ViewPlugin.define((view) => {
    const pane = view.dom.closest<HTMLElement>("[data-pane]");
    if (!pane) {
      return { destroy() {} };
    }

    let wasHidden = pane.classList.contains("invisible");

    const observer = new MutationObserver(() => {
      if (isDisposed()) {
        return;
      }
      const isHidden = pane.classList.contains("invisible");
      if (wasHidden && !isHidden) {
        view.focus();
      }
      wasHidden = isHidden;
    });

    observer.observe(pane, { attributes: true, attributeFilter: ["class"] });
    return { destroy: () => observer.disconnect() };
  });
}

function createEditorExtensions({
  getWikiPages,
  isDisposed,
  onChange,
  onOpenWikiLink,
  uploadImage,
}: {
  getWikiPages: () => ProsemarkWikiPage[];
  isDisposed: () => boolean;
  onChange: (body: string) => void;
  onOpenWikiLink?: (
    page: ProsemarkWikiPage,
    options: ProsemarkWikiOpenOptions
  ) => void;
  uploadImage: (file: File) => Promise<string>;
}): Extension[] {
  const setupCompartment = new Compartment();

  return [
    markdown({
      codeLanguages: languages,
      extensions: [
        GFM,
        prosemarkMarkdownSyntaxExtensions,
        htmlBlockParserExtension,
      ],
    }),
    setupCompartment.of(prosemarkBasicSetup()),
    drawSelection(),
    prosemarkBaseThemeSetup(),
    latexDecorations(),
    search({ literal: true, createPanel: invisibleSearchPanel }),
    autocompletion({ icons: false }),
    Prec.highest(
      keymap.of([
        {
          key: "Mod-f",
          run: (view) => {
            const event = new KeyboardEvent("keydown", {
              key: "f",
              metaKey: navigator.platform.includes("Mac"),
              ctrlKey: !navigator.platform.includes("Mac"),
              bubbles: true,
            });
            view.dom.dispatchEvent(event);
            return false;
          },
        },
      ])
    ),
    Prec.highest(
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: tags.strong, fontWeight: "600" },
          { tag: tags.heading, fontWeight: "600" },
          { tag: tags.heading1, fontWeight: "600" },
          { tag: tags.heading2, fontWeight: "600" },
          { tag: tags.heading3, fontWeight: "600" },
          { tag: tags.heading4, fontWeight: "600" },
          { tag: tags.heading5, fontWeight: "600" },
          { tag: tags.heading6, fontWeight: "600" },
        ])
      )
    ),
    tableDecorations(),
    htmlBlockDecorations(),
    imageDecorations(),
    mermaidDecorations(),
    noteWidgetDecorations(),
    wikiLinkExtension(getWikiPages, onOpenWikiLink),
    markdownFormatting,
    EditorView.updateListener.of((update) => {
      const isSwap = update.transactions.some((transaction) =>
        transaction.isUserEvent("avenire.swap")
      );
      if (update.docChanged && !isSwap) {
        onChange(update.state.doc.toString());
      }
    }),
    EditorView.domEventHandlers({
      paste(event, view) {
        const items = event.clipboardData?.items;
        if (!items) {
          return false;
        }

        for (const item of items) {
          if (!item.type.startsWith("image/")) {
            continue;
          }
          const imageFile = item.getAsFile();
          if (!imageFile) {
            continue;
          }

          event.preventDefault();
          void uploadImage(imageFile).then((src) => {
            if (isDisposed()) {
              return;
            }
            const cursor = view.state.selection.main.head;
            view.dispatch({
              changes: { from: cursor, insert: `![${imageFile.name}](${src})` },
            });
          });
          return true;
        }

        return false;
      },
      drop(event, view) {
        const file = Array.from(event.dataTransfer?.files ?? []).find((entry) =>
          entry.type.startsWith("image/")
        );
        if (!file) {
          return false;
        }

        event.preventDefault();
        void uploadImage(file).then((src) => {
          if (isDisposed()) {
            return;
          }
          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
          view.dispatch({
            changes: {
              from: pos ?? view.state.selection.main.head,
              insert: `![${file.name}](${src})`,
            },
          });
        });
        return true;
      },
      keydown(event, view) {
        if (event.key !== "-") {
          return false;
        }

        const { doc, selection } = view.state;
        const pos = selection.main.head;
        const firstLine = doc.line(1);
        if (pos !== firstLine.from + 2 || firstLine.text !== "--") {
          return false;
        }

        event.preventDefault();
        view.dispatch({
          changes: { from: firstLine.from, to: firstLine.from + 2 },
        });
        onChange(view.state.doc.toString());
        return true;
      },
    }),
    focusOnRevealExtension(isDisposed),
  ];
}

export const AvenireProsemarkEditor = memo(function AvenireProsemarkEditor({
  createdBy,
  defaultValue,
  noteTitle = "",
  onChange,
  onOpenWikiLink,
  onTemplateApplied,
  scrollContainerRef: _scrollContainerRef,
  wikiPages,
  workspaceUuid,
}: AvenireProsemarkEditorProps) {
  const parsed = useMemo(
    () => parseMarkdownDocument(defaultValue),
    [defaultValue]
  );
  const [frontmatter, setFrontmatter] = useState<string | null>(
    parsed.frontmatter
  );
  const frontmatterRef = useRef(parsed.frontmatter);
  const bodyRef = useRef(parsed.body);
  const wikiPagesRef = useRef(wikiPages);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const disposedRef = useRef(false);
  const { startUpload: startImageUpload } = useUploadThing("imageUploader");
  const onChangeRef = useRef(onChange);
  const onOpenWikiLinkRef = useRef(onOpenWikiLink);
  const startImageUploadRef = useRef(startImageUpload);
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>(() =>
    getDefaultNoteTemplates()
  );
  const [recentTemplateIds, setRecentTemplateIds] = useState<string[]>([]);

  wikiPagesRef.current = wikiPages;
  frontmatterRef.current = frontmatter;
  onChangeRef.current = onChange;
  onOpenWikiLinkRef.current = onOpenWikiLink;
  startImageUploadRef.current = startImageUpload;

  const emitChange = useCallback(
    (nextFrontmatter: string | null, nextBody: string) => {
      frontmatterRef.current = nextFrontmatter;
      bodyRef.current = nextBody;
      onChangeRef.current(serializeMarkdownDocument(nextFrontmatter, nextBody));
    },
    []
  );

  const uploadImage = useCallback(async (file: File) => {
    const uploaded = ((await startImageUploadRef.current([file])) ?? [])[0] as
      | { ufsUrl?: string; url?: string }
      | undefined;
    const uploadedUrl =
      (typeof uploaded?.ufsUrl === "string" && uploaded.ufsUrl) ||
      (typeof uploaded?.url === "string" && uploaded.url) ||
      "";
    if (!uploadedUrl) {
      throw new Error("Unable to upload image.");
    }
    return uploadedUrl;
  }, []);

  const insertMarkdown = useCallback((markdown: string) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const insert = markdown.endsWith("\n") ? markdown : `${markdown}\n`;
    view.dispatch(view.state.replaceSelection(insert));
    view.focus();
  }, []);

  useEffect(() => {
    setNoteTemplates(loadWorkspaceNoteTemplates(workspaceUuid));
    setRecentTemplateIds(loadRecentTemplateIds(workspaceUuid));
  }, [workspaceUuid]);

  useEffect(() => {
    const handleInsertWidget = (event: Event) => {
      const detail = (event as CustomEvent<NoteWidgetPayload>).detail;
      if (!detail?.html?.trim()) {
        return;
      }
      insertMarkdown(
        [
          "```avenire-widget",
          serializeNoteWidgetPayload({
            html: detail.html,
            title: detail.title ?? null,
          }),
          "```",
          "",
        ].join("\n")
      );
    };

    window.addEventListener(NOTE_WIDGET_INSERT_EVENT, handleInsertWidget);
    return () => {
      window.removeEventListener(NOTE_WIDGET_INSERT_EVENT, handleInsertWidget);
    };
  }, [insertMarkdown]);

  useEffect(() => {
    setFrontmatter(parsed.frontmatter);
    frontmatterRef.current = parsed.frontmatter;
    bodyRef.current = parsed.body;

    const view = viewRef.current;
    if (!view || view.state.doc.toString() === parsed.body) {
      return;
    }
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: parsed.body },
      userEvent: "avenire.swap",
    });
  }, [parsed.body, parsed.frontmatter]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || viewRef.current) {
      return;
    }

    disposedRef.current = false;
    const state = EditorState.create({
      doc: bodyRef.current,
      extensions: createEditorExtensions({
        getWikiPages: () => wikiPagesRef.current,
        isDisposed: () => disposedRef.current,
        onChange: (body) => emitChange(frontmatterRef.current, body),
        onOpenWikiLink: (page, options) =>
          onOpenWikiLinkRef.current?.(page, options),
        uploadImage,
      }),
    });
    const view = new EditorView({ state, parent: host });
    viewRef.current = view;
    advanceViewportParse(view, () => disposedRef.current);

    return () => {
      disposedRef.current = true;
      view.destroy();
      viewRef.current = null;
    };
  }, [emitChange, uploadImage]);

  const fullMarkdown = serializeMarkdownDocument(frontmatter, bodyRef.current);
  const showTemplates = isMarkdownNoteTemplateTargetEmpty(
    fullMarkdown,
    noteTitle
  );
  const orderedTemplates = useMemo(() => {
    const byId = new Map(
      noteTemplates.map((template) => [template.id, template])
    );
    const recent = recentTemplateIds
      .map((id) => byId.get(id))
      .filter((template): template is NoteTemplate => Boolean(template));
    const fallback = noteTemplates.filter(
      (template) => !recentTemplateIds.includes(template.id)
    );
    return [...recent, ...fallback].slice(0, 3);
  }, [noteTemplates, recentTemplateIds]);

  return (
    <div className="scribe-shell prosemark-scribe-shell">
      <div
        className="prosemark-frontmatter-wrap"
        style={{
          maxWidth: "var(--writer-editor-outer-width)",
          paddingLeft: "var(--writer-editor-side-padding)",
          paddingRight: "var(--writer-editor-side-padding)",
        }}
      >
        <FrontmatterPanel
          frontmatter={frontmatter}
          onChange={(nextFrontmatter) => {
            setFrontmatter(nextFrontmatter);
            emitChange(nextFrontmatter, bodyRef.current);
          }}
        />
      </div>
      <div className="prosemark-editor-host" ref={hostRef} />
      {showTemplates ? (
        <div className="prosemark-template-actions">
          {orderedTemplates.map((template) => (
            <button
              key={template.id}
              onClick={() => {
                const rendered = renderMarkdownNoteTemplate(template.content, {
                  createdBy,
                  title: noteTitle,
                });
                const parsedTemplate = parseMarkdownDocument(rendered);
                setFrontmatter(parsedTemplate.frontmatter);
                emitChange(parsedTemplate.frontmatter, parsedTemplate.body);
                const view = viewRef.current;
                if (view) {
                  view.dispatch({
                    changes: {
                      from: 0,
                      to: view.state.doc.length,
                      insert: parsedTemplate.body,
                    },
                    userEvent: "avenire.swap",
                  });
                  view.focus();
                }
                persistRecentTemplate(workspaceUuid, template.id);
                setRecentTemplateIds((current) => [
                  template.id,
                  ...current.filter((entry) => entry !== template.id),
                ]);
                onTemplateApplied?.(template, rendered);
              }}
              type="button"
            >
              {template.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});
