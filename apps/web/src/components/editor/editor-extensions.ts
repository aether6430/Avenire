"use client";

import {
  Extension,
  InputRule,
  mergeAttributes,
  Node as TiptapNode,
} from "@tiptap/core";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { BlockMath, InlineMath } from "@tiptap/extension-mathematics";
import { Fragment } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Editor } from "@tiptap/react";
import { renderMermaidSVG } from "beautiful-mermaid";
import { common, createLowlight } from "lowlight";
import {
  BLOCK_MATH_INPUT_REGEX,
  clamp,
  INLINE_MATH_INPUT_REGEX,
  looksLikeMarkdown,
  MERMAID_DEFAULT,
} from "@/components/editor/editor-core";
import { getUserSettingsSnapshot } from "@/lib/user-settings-client";

const lowlight = createLowlight(common);

const CODE_ICON_SVG = {
  copy: '<svg viewBox="0 0 256 256" aria-hidden="true"><rect x="88" y="64" width="104" height="128" rx="8" fill="none" stroke="currentColor" stroke-width="18"/><path d="M64 160H56a8 8 0 0 1-8-8V40a8 8 0 0 1 8-8h112a8 8 0 0 1 8 8v8" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
  edit: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M92 216H48a8 8 0 0 1-8-8v-44L156 48a24 24 0 0 1 34 0l18 18a24 24 0 0 1 0 34Z" fill="none" stroke="currentColor" stroke-width="18" stroke-linejoin="round"/><path d="m140 64 52 52" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
  preview:
    '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M24 128s40-72 104-72 104 72 104 72-40 72-104 72S24 128 24 128Z" fill="none" stroke="currentColor" stroke-width="18" stroke-linejoin="round"/><circle cx="128" cy="128" r="32" fill="none" stroke="currentColor" stroke-width="18"/></svg>',
};

const MERMAID_ICON_SVG = {
  edit: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M92 216H48a8 8 0 0 1-8-8v-44L156 48a24 24 0 0 1 34 0l18 18a24 24 0 0 1 0 34Z" fill="none" stroke="currentColor" stroke-width="18" stroke-linejoin="round"/><path d="m140 64 52 52" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
  full: '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M88 40H48a8 8 0 0 0-8 8v40M168 40h40a8 8 0 0 1 8 8v40M88 216H48a8 8 0 0 1-8-8v-40M168 216h40a8 8 0 0 0 8-8v-40" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  reset:
    '<svg viewBox="0 0 256 256" aria-hidden="true"><path d="M64 88H32V56" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/><path d="M65 88a80 80 0 1 1-17 52" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
  zoomIn:
    '<svg viewBox="0 0 256 256" aria-hidden="true"><circle cx="112" cy="112" r="72" fill="none" stroke="currentColor" stroke-width="18"/><path d="M163 163 216 216M112 80v64M80 112h64" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
  zoomOut:
    '<svg viewBox="0 0 256 256" aria-hidden="true"><circle cx="112" cy="112" r="72" fill="none" stroke="currentColor" stroke-width="18"/><path d="M163 163 216 216M80 112h64" fill="none" stroke="currentColor" stroke-width="18" stroke-linecap="round"/></svg>',
};

interface LowlightTreeNode {
  children?: LowlightTreeNode[];
  properties?: {
    className?: string[] | string;
  };
  tagName?: string;
  type?: string;
  value?: string;
}

const renderLowlightNodes = (
  parent: HTMLElement,
  nodes: LowlightTreeNode[] = []
) => {
  for (const child of nodes) {
    if (child.type === "text") {
      parent.appendChild(document.createTextNode(child.value ?? ""));
      continue;
    }

    const element = document.createElement(child.tagName ?? "span");
    const className = child.properties?.className;
    if (Array.isArray(className)) {
      element.className = className.join(" ");
    } else if (typeof className === "string") {
      element.className = className;
    }
    renderLowlightNodes(element, child.children ?? []);
    parent.appendChild(element);
  }
};

const renderHighlightedCodePreview = (
  target: HTMLElement,
  code: string,
  language?: string | null
) => {
  target.replaceChildren();
  try {
    const highlighter = lowlight as unknown as {
      highlight: (language: string, code: string) => LowlightTreeNode;
      highlightAuto: (code: string) => LowlightTreeNode;
    };
    const tree = language
      ? highlighter.highlight(language, code)
      : highlighter.highlightAuto(code);
    renderLowlightNodes(target, tree.children ?? []);
  } catch {
    target.textContent = code;
  }
};

export const ScribeCodeBlockLowlight = CodeBlockLowlight.extend({
  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement("div");
      dom.className = "scribe-codeblock-node";
      dom.dataset.editing = "false";

      const preview = document.createElement("pre");
      preview.className = "scribe-codeblock-preview";
      const previewCode = document.createElement("code");
      preview.appendChild(previewCode);

      const editorPre = document.createElement("pre");
      editorPre.className = "scribe-codeblock-editor";
      const contentDOM = document.createElement("code");
      editorPre.appendChild(contentDOM);

      const controls = document.createElement("div");
      controls.className = "scribe-codeblock-controls";
      controls.contentEditable = "false";

      const languageSelect = document.createElement("select");
      languageSelect.className = "scribe-codeblock-language";
      languageSelect.setAttribute("aria-label", "Code block language");

      const languages = [
        "plaintext",
        ...Object.keys(common).sort((a, b) => a.localeCompare(b)),
      ];

      for (const language of languages) {
        const option = document.createElement("option");
        option.value = language;
        option.textContent = language;
        languageSelect.appendChild(option);
      }

      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "scribe-codeblock-button";
      copyButton.innerHTML = CODE_ICON_SVG.copy;
      copyButton.setAttribute("aria-label", "Copy code");
      copyButton.title = "Copy code";

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "scribe-codeblock-button";
      editButton.title = "Toggle preview";

      const syncButtonLabel = () => {
        editButton.innerHTML =
          dom.dataset.editing === "true"
            ? CODE_ICON_SVG.preview
            : CODE_ICON_SVG.edit;
        editButton.setAttribute(
          "aria-label",
          dom.dataset.editing === "true" ? "Preview code" : "Edit code"
        );
      };

      const syncPreview = (nextNode = node) => {
        const language =
          typeof nextNode.attrs.language === "string"
            ? nextNode.attrs.language
            : null;
        languageSelect.value = language || "plaintext";
        previewCode.dataset.language = language ?? "";
        renderHighlightedCodePreview(
          previewCode,
          nextNode.textContent,
          language
        );
      };

      languageSelect.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });

      languageSelect.addEventListener("change", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (typeof pos !== "number") {
          return;
        }
        const value = languageSelect.value;
        editor
          .chain()
          .focus(pos + 1)
          .updateAttributes("codeBlock", {
            language: value === "plaintext" ? null : value,
          })
          .run();
      });

      copyButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const originalLabel = copyButton.innerHTML;
        const writeText = globalThis.navigator?.clipboard?.writeText?.bind(
          globalThis.navigator.clipboard
        );

        if (!writeText) {
          copyButton.innerHTML = "<span>Failed</span>";
          window.setTimeout(() => {
            copyButton.innerHTML = originalLabel;
          }, 1200);
          return;
        }

        void writeText(node.textContent).then(
          () => {
            copyButton.innerHTML = "<span>Copied</span>";
            window.setTimeout(() => {
              copyButton.innerHTML = originalLabel;
            }, 1200);
          },
          () => {
            copyButton.innerHTML = "<span>Failed</span>";
            window.setTimeout(() => {
              copyButton.innerHTML = originalLabel;
            }, 1200);
          }
        );
      });

      editButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextEditing = dom.dataset.editing !== "true";
        dom.dataset.editing = String(nextEditing);
        syncButtonLabel();
        if (nextEditing) {
          const pos = getPos();
          if (typeof pos === "number") {
            editor
              .chain()
              .focus(pos + 1)
              .run();
          } else {
            editor.commands.focus();
          }
        }
      });

      syncPreview();
      syncButtonLabel();
      controls.append(languageSelect, copyButton, editButton);
      dom.append(controls, preview, editorPre);

      return {
        dom,
        contentDOM,
        update(updatedNode) {
          if (updatedNode.type !== node.type) {
            return false;
          }
          node = updatedNode;
          syncPreview(updatedNode);
          return true;
        },
      };
    };
  },
});

export const PasteMarkdownExtension = Extension.create({
  name: "pasteMarkdown",

  addProseMirrorPlugins() {
    const { editor } = this;

    return [
      new Plugin({
        props: {
          handlePaste(_view, event) {
            const text = event.clipboardData?.getData("text/plain")?.trim();

            if (!(text && looksLikeMarkdown(text))) {
              return false;
            }

            if (!editor.markdown) {
              return false;
            }

            event.preventDefault();
            const json = editor.markdown.parse(text);

            editor.commands.insertContent(json);
            return true;
          },
        },
      }),
    ];
  },
});

export const InlineMathExtension = InlineMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: INLINE_MATH_INPUT_REGEX,
        handler: ({
          state,
          range,
          match,
        }: {
          state: EditorState;
          range: { from: number; to: number };
          match: RegExpMatchArray;
        }) => {
          const [, prefix, latex] = match;
          const start = range.from + prefix.length;
          const end = range.to;
          const { tr } = state;

          tr.replaceWith(start, end, this.type.create({ latex: latex.trim() }));
        },
      }),
    ];
  },
});

export const BlockMathExtension = BlockMath.extend({
  addInputRules() {
    return [
      new InputRule({
        find: BLOCK_MATH_INPUT_REGEX,
        handler: ({
          state,
          range,
          match,
        }: {
          state: EditorState;
          range: { from: number; to: number };
          match: RegExpMatchArray;
        }) => {
          const [, latex] = match;
          const { tr } = state;

          tr.replaceWith(
            range.from,
            range.to,
            this.type.create({ latex: latex.trim() })
          );
        },
      }),
    ];
  },
});

const MERMAID_CANVAS_HEIGHT = 480;
const MERMAID_ZOOM_MIN = 0.25;
const MERMAID_ZOOM_MAX = 4;
const MERMAID_BUTTON_ZOOM_FACTOR = 1.2;
const MERMAID_KEY_ZOOM_FACTOR = 1.15;
const MERMAID_WHEEL_ZOOM_SENSITIVITY = 0.0015;
const MERMAID_KEY_PAN_STEP = 24;
const MERMAID_FIT_MARGIN_PX = 16;
const MERMAID_DEFAULT_SCALE = 1;

export const MermaidDiagramExtension = TiptapNode.create({
  name: "mermaidDiagram",
  group: "block",
  atom: true,
  addOptions() {
    return {
      onClick: undefined as
        | ((node: { attrs: { code?: string } }, pos: number) => void)
        | undefined,
    };
  },
  addAttributes() {
    return {
      code: {
        default: MERMAID_DEFAULT,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-code") ?? "",
        renderHTML: (attrs) => ({ "data-code": attrs.code }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="mermaid-diagram"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "mermaid-diagram" }),
    ];
  },
  addCommands() {
    return {
      insertMermaidDiagram:
        (options: { code?: string; pos?: number }) =>
        ({
          commands,
          editor,
        }: {
          commands: {
            insertContentAt: (pos: number, content: unknown) => boolean;
          };
          editor: Editor;
        }) => {
          const code = options.code ?? MERMAID_DEFAULT;
          const pos = options.pos ?? editor.state.selection.from;
          return commands.insertContentAt(pos, {
            type: this.name,
            attrs: { code },
          });
        },
      updateMermaidDiagram:
        (options: { pos: number; code: string }) =>
        ({
          editor,
          tr,
        }: {
          editor: Editor;
          tr: import("@tiptap/pm/state").Transaction;
        }) => {
          const node = editor.state.doc.nodeAt(options.pos);
          if (!node || node.type.name !== this.name) {
            return false;
          }
          tr.setNodeMarkup(options.pos, this.type, {
            ...node.attrs,
            code: options.code,
          });
          return true;
        },
      deleteMermaidDiagram:
        (options: { pos: number }) =>
        ({
          editor,
          tr,
        }: {
          editor: Editor;
          tr: import("@tiptap/pm/state").Transaction;
        }) => {
          const node = editor.state.doc.nodeAt(options.pos);
          if (!node || node.type.name !== this.name) {
            return false;
          }
          tr.delete(options.pos, options.pos + node.nodeSize);
          return true;
        },
    } as Record<string, unknown>;
  },
  parseMarkdown(token: unknown) {
    const code = (token as { code?: string }).code ?? MERMAID_DEFAULT;
    return { type: "mermaidDiagram", attrs: { code } };
  },
  renderMarkdown(node: { attrs?: { code?: string } }) {
    const code = node.attrs?.code ?? "";
    return ["```mermaid\n", code, "\n```"].join("");
  },
  markdownTokenName: "mermaidDiagram",
  markdownTokenizer: {
    name: "mermaidDiagram",
    level: "block",
    start: (src: string) => src.indexOf("```mermaid"),
    tokenize(src: string) {
      const match = src.match(/^```mermaid\n([\s\S]*?)```/);
      if (!match) {
        return undefined;
      }
      const [, code] = match;
      return {
        type: "mermaidDiagram",
        raw: match[0],
        code: (code ?? "").trim(),
      };
    },
  },
  addNodeView() {
    return ({ node, getPos }) => {
      const wrapper = document.createElement("div");
      wrapper.className = "mermaid-diagram-wrapper";
      wrapper.setAttribute("data-type", "mermaid-diagram");
      const viewport = document.createElement("div");
      viewport.className = "mermaid-diagram-viewport";
      viewport.tabIndex = 0;
      const container = document.createElement("div");
      container.className = "mermaid-diagram-container";
      viewport.appendChild(container);
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "mermaid-diagram-edit";
      editButton.innerHTML = MERMAID_ICON_SVG.edit;
      editButton.setAttribute("aria-label", "Edit diagram");
      editButton.title = "Edit diagram";
      const zoomControls = document.createElement("div");
      zoomControls.className = "mermaid-diagram-zoom";
      wrapper.append(viewport, editButton, zoomControls);

      const canvasState = {
        zoom: 1,
        panX: 0,
        panY: 0,
      };
      let naturalWidth = 0;
      let naturalHeight = 0;
      let pointerId: number | null = null;
      let dragStartX = 0;
      let dragStartY = 0;
      let dragStartPanX = 0;
      let dragStartPanY = 0;

      const applyTransform = () => {
        const svg = container.querySelector("svg") as SVGSVGElement | null;
        if (svg && naturalWidth > 0 && naturalHeight > 0) {
          svg.style.width = `${naturalWidth * canvasState.zoom}px`;
          svg.style.height = `${naturalHeight * canvasState.zoom}px`;
        }
        container.style.transform = `translate(${canvasState.panX}px, ${canvasState.panY}px)`;
      };

      const measureNatural = () => {
        if (naturalWidth > 0 && naturalHeight > 0) {
          return;
        }
        const svg = container.querySelector("svg") as SVGSVGElement | null;
        if (!svg) {
          return;
        }
        const viewBox = svg.viewBox.baseVal;
        if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
          naturalWidth = viewBox.width;
          naturalHeight = viewBox.height;
          return;
        }
        const rect = svg.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          naturalWidth = rect.width;
          naturalHeight = rect.height;
        }
      };

      const fitToViewport = () => {
        measureNatural();
        const viewportWidth = viewport.clientWidth;
        const viewportHeight = viewport.clientHeight;
        if (
          naturalWidth <= 0 ||
          naturalHeight <= 0 ||
          viewportWidth <= 0 ||
          viewportHeight <= 0
        ) {
          applyTransform();
          return;
        }
        const fit = Math.min(
          (viewportWidth - MERMAID_FIT_MARGIN_PX * 2) / naturalWidth,
          (viewportHeight - MERMAID_FIT_MARGIN_PX * 2) / naturalHeight
        );
        canvasState.zoom = clamp(
          Math.min(fit, MERMAID_DEFAULT_SCALE),
          MERMAID_ZOOM_MIN,
          MERMAID_ZOOM_MAX
        );
        canvasState.panX =
          (viewportWidth - naturalWidth * canvasState.zoom) / 2;
        canvasState.panY =
          (viewportHeight - naturalHeight * canvasState.zoom) / 2;
        applyTransform();
      };

      const panBy = (deltaX: number, deltaY: number) => {
        canvasState.panX += deltaX;
        canvasState.panY += deltaY;
        applyTransform();
      };

      const zoomAt = (clientX: number, clientY: number, factor: number) => {
        measureNatural();
        const rect = viewport.getBoundingClientRect();
        const localX = clientX - rect.left;
        const localY = clientY - rect.top;
        const stageX = (localX - canvasState.panX) / canvasState.zoom;
        const stageY = (localY - canvasState.panY) / canvasState.zoom;
        const nextZoom = clamp(
          canvasState.zoom * factor,
          MERMAID_ZOOM_MIN,
          MERMAID_ZOOM_MAX
        );
        if (nextZoom === canvasState.zoom) {
          return;
        }
        canvasState.zoom = nextZoom;
        canvasState.panX = localX - stageX * nextZoom;
        canvasState.panY = localY - stageY * nextZoom;
        applyTransform();
      };

      const zoomAtCenter = (factor: number) => {
        const rect = viewport.getBoundingClientRect();
        zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
      };

      const buildControlButton = (
        icon: string,
        title: string,
        onClick: () => void
      ) => {
        const button = document.createElement("button");
        button.type = "button";
        button.innerHTML = icon;
        button.title = title;
        button.setAttribute("aria-label", title);
        button.className = "mermaid-diagram-zoom-button";
        button.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onClick();
        });
        return button;
      };

      zoomControls.append(
        buildControlButton(MERMAID_ICON_SVG.zoomIn, "Zoom in", () =>
          zoomAtCenter(MERMAID_BUTTON_ZOOM_FACTOR)
        ),
        buildControlButton(MERMAID_ICON_SVG.zoomOut, "Zoom out", () =>
          zoomAtCenter(1 / MERMAID_BUTTON_ZOOM_FACTOR)
        ),
        buildControlButton(MERMAID_ICON_SVG.reset, "Reset view", fitToViewport),
        buildControlButton(MERMAID_ICON_SVG.full, "Expand diagram", () =>
          wrapper.classList.toggle("is-expanded")
        )
      );

      let mounted = true;
      const renderDiagram = () => {
        const code =
          (node.attrs as { code?: string }).code?.trim() || MERMAID_DEFAULT;
        try {
          if (!mounted) {
            return;
          }
          const svg = renderMermaidSVG(code, {
            bg: "var(--background)",
            fg: "var(--foreground)",
            accent: "var(--primary)",
            transparent: true,
          });
          naturalWidth = 0;
          naturalHeight = 0;
          container.innerHTML = svg;
          const renderedSvg = container.querySelector(
            "svg"
          ) as SVGSVGElement | null;
          renderedSvg?.setAttribute("role", "img");
          renderedSvg?.setAttribute("aria-label", "Mermaid diagram");
          container.style.opacity = "0";
          requestAnimationFrame(() => {
            fitToViewport();
            container.style.opacity = "1";
          });
        } catch {
          if (mounted) {
            container.innerHTML = "";
            const pre = document.createElement("pre");
            pre.className = "mermaid-diagram-error";
            pre.textContent = code || "Invalid diagram";
            container.appendChild(pre);
          }
        }

        applyTransform();
      };

      renderDiagram();

      const openDiagramEditor = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        const pos = getPos();
        if (typeof pos !== "number") {
          return;
        }
        if (this.options.onClick) {
          this.options.onClick(node, pos);
        }
      };
      editButton.addEventListener("click", openDiagramEditor);

      const handlePointerDown = (event: PointerEvent) => {
        if (event.target instanceof HTMLButtonElement) {
          return;
        }

        pointerId = event.pointerId;
        dragStartX = event.clientX;
        dragStartY = event.clientY;
        dragStartPanX = canvasState.panX;
        dragStartPanY = canvasState.panY;
        viewport.setPointerCapture(event.pointerId);
        viewport.classList.add("is-dragging");
        viewport.focus();
        event.preventDefault();
      };

      const handlePointerMove = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) {
          return;
        }

        canvasState.panX = dragStartPanX + (event.clientX - dragStartX);
        canvasState.panY = dragStartPanY + (event.clientY - dragStartY);
        applyTransform();
      };

      const handlePointerUp = (event: PointerEvent) => {
        if (pointerId !== event.pointerId) {
          return;
        }

        pointerId = null;
        viewport.classList.remove("is-dragging");
        if (viewport.hasPointerCapture(event.pointerId)) {
          viewport.releasePointerCapture(event.pointerId);
        }
      };

      const handleWheel = (event: WheelEvent) => {
        if (!(event.metaKey || event.ctrlKey)) {
          return;
        }
        event.preventDefault();
        const factor = Math.exp(-event.deltaY * MERMAID_WHEEL_ZOOM_SENSITIVITY);
        zoomAt(event.clientX, event.clientY, factor);
      };

      const handleKeyDown = (event: globalThis.KeyboardEvent) => {
        switch (event.key) {
          case "ArrowUp":
            event.preventDefault();
            panBy(0, MERMAID_KEY_PAN_STEP);
            return;
          case "ArrowDown":
            event.preventDefault();
            panBy(0, -MERMAID_KEY_PAN_STEP);
            return;
          case "ArrowLeft":
            event.preventDefault();
            panBy(MERMAID_KEY_PAN_STEP, 0);
            return;
          case "ArrowRight":
            event.preventDefault();
            panBy(-MERMAID_KEY_PAN_STEP, 0);
            return;
          case "+":
          case "=":
            event.preventDefault();
            zoomAtCenter(MERMAID_KEY_ZOOM_FACTOR);
            return;
          case "-":
          case "_":
            event.preventDefault();
            zoomAtCenter(1 / MERMAID_KEY_ZOOM_FACTOR);
            return;
          case "0":
            event.preventDefault();
            fitToViewport();
            return;
          default:
            return;
        }
      };

      viewport.addEventListener("pointerdown", handlePointerDown);
      viewport.addEventListener("pointermove", handlePointerMove);
      viewport.addEventListener("pointerup", handlePointerUp);
      viewport.addEventListener("pointercancel", handlePointerUp);
      viewport.addEventListener("wheel", handleWheel, { passive: false });
      viewport.addEventListener("keydown", handleKeyDown);

      return {
        dom: wrapper,
        update: (updatedNode: typeof node) => {
          if (updatedNode.type !== this.type) {
            return false;
          }
          node = updatedNode;
          renderDiagram();
          return true;
        },
        destroy: () => {
          mounted = false;
          editButton.removeEventListener("click", openDiagramEditor);
          viewport.removeEventListener("pointerdown", handlePointerDown);
          viewport.removeEventListener("pointermove", handlePointerMove);
          viewport.removeEventListener("pointerup", handlePointerUp);
          viewport.removeEventListener("pointercancel", handlePointerUp);
          viewport.removeEventListener("wheel", handleWheel);
          viewport.removeEventListener("keydown", handleKeyDown);
        },
      };
    };
  },
});

export const TaskListSortExtension = Extension.create({
  name: "taskListSort",
  addProseMirrorPlugins() {
    const taskListType = this.editor.schema.nodes.taskList;
    const taskItemType = this.editor.schema.nodes.taskItem;
    if (!(taskListType && taskItemType)) {
      return [];
    }

    return [
      new Plugin({
        key: new PluginKey("taskListSort"),
        appendTransaction(_transactions, _oldState, state) {
          const ranges: {
            from: number;
            to: number;
            fragment: ReturnType<typeof Fragment.from>;
          }[] = [];

          state.doc.descendants((node, pos) => {
            if (node.type !== taskListType) {
              return;
            }
            const contentStart = pos + 1;
            const contentEnd = pos + node.nodeSize - 1;
            const completedTasksAtTop =
              getUserSettingsSnapshot().settings.completedTasksAtTop;
            const completionRank = (checked: boolean) =>
              completedTasksAtTop ? (checked ? 0 : 1) : checked ? 1 : 0;
            const items: {
              index: number;
              node: ReturnType<typeof node.child>;
            }[] = [];
            for (let i = 0; i < node.childCount; i++) {
              const child = node.child(i);
              if (child.type === taskItemType) {
                items.push({ index: i, node: child });
              }
            }
            const sorted = [...items].sort((a, b) => {
              const aChecked = completionRank(
                Boolean((a.node.attrs as { checked?: boolean }).checked)
              );
              const bChecked = completionRank(
                Boolean((b.node.attrs as { checked?: boolean }).checked)
              );
              return aChecked - bChecked || a.index - b.index;
            });
            const sameOrder = items.every((item, i) =>
              item.node.eq(sorted[i]?.node)
            );
            if (!sameOrder) {
              ranges.push({
                from: contentStart,
                to: contentEnd,
                fragment: Fragment.from(sorted.map((s) => s.node)),
              });
            }
          });

          if (ranges.length === 0) {
            return null;
          }
          const tr = state.tr;
          for (let i = ranges.length - 1; i >= 0; i--) {
            const { from, to, fragment } = ranges[i]!;
            tr.replaceWith(from, to, fragment);
          }
          return tr;
        },
      }),
    ];
  },
});
