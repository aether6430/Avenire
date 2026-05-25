"use client";

import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import {
  BulletList,
  ListItem,
  ListKeymap,
  OrderedList,
  TaskItem,
  TaskList,
} from "@tiptap/extension-list";
import { migrateMathStrings } from "@tiptap/extension-mathematics";
import Placeholder from "@tiptap/extension-placeholder";
import { TableKit } from "@tiptap/extension-table";
import TableOfContents, {
  type TableOfContentDataItem,
} from "@tiptap/extension-table-of-contents";
import { TextStyle } from "@tiptap/extension-text-style";
import { Markdown } from "@tiptap/markdown";
import { NodeSelection } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { common, createLowlight } from "lowlight";
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";
import {
  getEventTargetElement,
  getImagePickerTab,
  getWorkspaceFileIdFromHref,
  type ImagePopoverState,
  type MathPopoverState,
  MERMAID_DEFAULT,
  type MermaidPopoverState,
  normalizeWikiSyntax,
  type WikiOpenOptions,
  type WikiPage,
} from "@/components/editor/editor-core";
import {
  BlockMathExtension,
  InlineMathExtension,
  MermaidDiagramExtension,
  PasteMarkdownExtension,
  ScribeCodeBlockLowlight,
  TaskListSortExtension,
} from "@/components/editor/editor-extensions";
import { NoteWidgetExtension } from "@/components/editor/note-widget-extension";

const lowlight = createLowlight(common);

export function createAvenireEditorConfig({
  allWikiPagesRef,
  normalizedDefaultValue,
  noteTitle: _noteTitle,
  onChange,
  openWikiPage,
  openWorkspaceFileIdentifier,
  resolveWikiPageFromHref,
  scrollContainerRef,
  setImagePopover,
  setMathPopover,
  setMermaidPopover,
  setTableOfContentsItems,
}: {
  allWikiPagesRef: MutableRefObject<WikiPage[]>;
  normalizedDefaultValue: string;
  noteTitle: string;
  onChange: (value: string) => void;
  openWikiPage: (page: WikiPage, options?: WikiOpenOptions) => void;
  openWorkspaceFileIdentifier: (
    fileIdentifier: string,
    options: WikiOpenOptions
  ) => void;
  resolveWikiPageFromHref: (href: string | null) => WikiPage | null;
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  setImagePopover: Dispatch<SetStateAction<ImagePopoverState | null>>;
  setMathPopover: Dispatch<SetStateAction<MathPopoverState | null>>;
  setMermaidPopover: Dispatch<SetStateAction<MermaidPopoverState | null>>;
  setTableOfContentsItems: Dispatch<SetStateAction<TableOfContentDataItem[]>>;
}) {
  return {
    extensions: [
      Markdown.configure({
        markedOptions: {
          gfm: true,
        },
      }),
      StarterKit.configure({
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
      }),
      BulletList.configure({
        keepMarks: true,
        keepAttributes: false,
      }),
      OrderedList.configure({
        keepMarks: true,
        keepAttributes: false,
      }),
      ListItem,
      ListKeymap.configure({
        listTypes: [
          {
            itemName: "listItem",
            wrapperNames: ["bulletList", "orderedList"],
          },
          {
            itemName: "taskItem",
            wrapperNames: ["taskList"],
          },
        ],
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TaskListSortExtension,
      TextStyle,
      Color,
      ScribeCodeBlockLowlight.configure({
        lowlight,
      }),
      HorizontalRule,
      Placeholder.configure({
        placeholder: "Type '/' for commands, or start with markdown shortcuts…",
      }),
      Highlight.configure({ multicolor: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: "https",
      }),
      PasteMarkdownExtension,
      BlockMathExtension.configure({
        onClick: (node, pos) => {
          setMathPopover({
            kind: "blockMath",
            pos,
            draft: String(node.attrs.latex ?? ""),
          });
        },
      }),
      InlineMathExtension.configure({
        onClick: (node, pos) => {
          setMathPopover({
            kind: "inlineMath",
            pos,
            draft: String(node.attrs.latex ?? ""),
          });
        },
      }),
      TableKit.configure({
        table: {
          resizable: true,
          renderWrapper: true,
          allowTableNodeSelection: true,
        },
      }),
      TableOfContents.configure({
        anchorTypes: ["heading"],
        onUpdate(data) {
          setTableOfContentsItems([...data]);
        },
        scrollParent: () => scrollContainerRef.current ?? window,
      }),
      Image.configure({
        allowBase64: true,
        inline: false,
        resize: {
          enabled: true,
          directions: ["top", "bottom", "left", "right"],
          minWidth: 80,
          minHeight: 80,
          alwaysPreserveAspectRatio: true,
        },
      }),
      MermaidDiagramExtension.configure({
        onClick: (node: { attrs: { code?: string } }, pos: number) => {
          setMermaidPopover({
            pos,
            draft: String(node.attrs?.code ?? MERMAID_DEFAULT),
          });
        },
      }),
      NoteWidgetExtension,
    ],
    content: normalizedDefaultValue,
    contentType: "markdown" as const,
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        class:
          "tiptap scribe-surface min-h-[100dvh] px-4 py-8 outline-none sm:px-10 sm:py-10",
      },
      handleClick(view: Editor["view"], _pos: number, event: MouseEvent) {
        const target = getEventTargetElement(event.target);
        const image = target?.closest("img");
        if (image) {
          const pos = view.posAtDOM(image, 0);
          const node = view.state.doc.nodeAt(pos);
          if (node?.type.name === "image") {
            event.preventDefault();
            view.dispatch(
              view.state.tr.setSelection(
                NodeSelection.create(view.state.doc, pos)
              )
            );
            setImagePopover({
              pos,
              src: String(node.attrs.src ?? ""),
              tab: getImagePickerTab(String(node.attrs.src ?? "")),
            });
            return true;
          }
        }

        const anchor = target?.closest(
          "a[href^='workspace-file://'], a[href^='wiki:'], a[href^='/wiki/']"
        ) as HTMLAnchorElement | null;
        if (!anchor) {
          return false;
        }

        const fileId = getWorkspaceFileIdFromHref(anchor.getAttribute("href"));
        if (fileId) {
          event.preventDefault();
          openWorkspaceFileIdentifier(fileId, {
            openInNewPane: event.altKey,
          });
          return true;
        }

        const page = resolveWikiPageFromHref(anchor.getAttribute("href"));
        if (!page) {
          return false;
        }
        event.preventDefault();
        openWikiPage(page, {
          openInNewPane: event.altKey,
        });
        return true;
      },
      handleDOMEvents: {
        mousedown(view: Editor["view"], event: MouseEvent) {
          const target = getEventTargetElement(event.target);
          const anchor = target?.closest(
            "a[href^='workspace-file://'], a[href^='wiki:'], a[href^='/wiki/']"
          ) as HTMLAnchorElement | null;
          if (!anchor) {
            return false;
          }

          const href = anchor.getAttribute("href");
          const fileId = getWorkspaceFileIdFromHref(href);
          const page = fileId ? null : resolveWikiPageFromHref(href);
          if (!(fileId || page)) {
            return false;
          }

          event.preventDefault();
          event.stopPropagation();
          view.focus();

          const options = { openInNewPane: event.altKey };
          if (fileId) {
            openWorkspaceFileIdentifier(fileId, options);
          } else if (page) {
            openWikiPage(page, options);
          }

          return true;
        },
        dragover(_view: Editor["view"], event: DragEvent) {
          const dataTransfer = event.dataTransfer;
          if (!dataTransfer) {
            return false;
          }
          const files = dataTransfer.files;
          if (!files?.length) {
            return false;
          }

          const hasImageFile = Array.from(files).some((file) =>
            file.type.startsWith("image/")
          );

          event.preventDefault();
          dataTransfer.dropEffect = hasImageFile ? "copy" : "none";
          return true;
        },
      },
      handleDrop(view: Editor["view"], event: DragEvent) {
        const files = event.dataTransfer?.files;
        if (!files?.length) {
          return false;
        }

        const file = Array.from(files).find((entry) =>
          entry.type.startsWith("image/")
        );
        if (!file) {
          event.preventDefault();
          return true;
        }

        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          const coords = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          if (coords) {
            const node = view.state.schema.nodes.image.create({ src });
            const tr = view.state.tr.insert(coords.pos, node);
            view.dispatch(tr);
          }
        };
        reader.readAsDataURL(file);
        return true;
      },
      handlePaste(view: Editor["view"], event: ClipboardEvent) {
        const files = event.clipboardData?.files;
        if (!files?.length) {
          return false;
        }
        const file = Array.from(files).find((entry) =>
          entry.type.startsWith("image/")
        );
        if (!file) {
          return false;
        }
        event.preventDefault();
        const reader = new FileReader();
        reader.onload = () => {
          const src = reader.result as string;
          view.dispatch(
            view.state.tr.replaceSelectionWith(
              view.state.schema.nodes.image.create({ src })
            )
          );
        };
        reader.readAsDataURL(file);
        return true;
      },
    },
    onCreate: ({ editor }: { editor: Editor }) => {
      migrateMathStrings(editor);
    },
    onUpdate: ({ editor }: { editor: Editor }) => {
      onChange(
        normalizeWikiSyntax(editor.getMarkdown(), allWikiPagesRef.current)
      );
    },
  };
}
