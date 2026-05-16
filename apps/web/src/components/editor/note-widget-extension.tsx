"use client";

import { mergeAttributes, Node as TiptapNode } from "@tiptap/core";
import {
  type NodeViewProps,
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from "@tiptap/react";
import { WidgetRenderer } from "@/components/WidgetRenderer";
import {
  parseSerializedNoteWidgetPayload,
  serializeNoteWidgetPayload,
} from "@/lib/note-widgets";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    noteWidget: {
      insertNoteWidget: (options: {
        html: string;
        pos?: number;
        title?: string | null;
      }) => ReturnType;
    };
  }
}

const NOTE_WIDGET_TOKEN = "avenire-widget";
const NOTE_WIDGET_DEFAULT_TITLE = "Interactive widget";

function NoteWidgetNodeView({ node }: NodeViewProps) {
  const html = String(node.attrs.html ?? "");
  const title = String(node.attrs.title ?? "").trim();

  return (
    <NodeViewWrapper
      className="my-4 block"
      contentEditable={false}
      data-type="note-widget"
      draggable={false}
    >
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/85 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-border/60 border-b px-4 py-3">
          <div className="min-w-0">
            <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-[0.24em]">
              {NOTE_WIDGET_DEFAULT_TITLE}
            </p>
            {title ? (
              <p className="truncate font-medium text-foreground text-sm">
                {title}
              </p>
            ) : null}
          </div>
          <div className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.18em]">
            Read only
          </div>
        </div>
        <div className="p-3 sm:p-4">
          <WidgetRenderer
            className="rounded-xl border border-border/60 bg-background"
            html={html}
            runScripts
          />
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const NoteWidgetExtension = TiptapNode.create({
  name: "noteWidget",
  group: "block",
  atom: true,
  draggable: false,
  isolating: true,
  selectable: false,
  addOptions() {
    return {
      onInsert: undefined as
        | ((
            node: { attrs: { html?: string; title?: string | null } },
            pos: number
          ) => void)
        | undefined,
    };
  },
  addAttributes() {
    return {
      html: {
        default: "",
        parseHTML: (element) => (element as HTMLElement).dataset.html ?? "",
        renderHTML: (attributes) => ({ "data-html": attributes.html }),
      },
      title: {
        default: null,
        parseHTML: (element) => (element as HTMLElement).dataset.title ?? null,
        renderHTML: (attributes) => ({
          "data-title": attributes.title ?? "",
        }),
      },
    };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="note-widget"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "note-widget" }),
    ];
  },
  addCommands() {
    return {
      insertNoteWidget:
        (options: { html: string; pos?: number; title?: string | null }) =>
        ({
          commands,
          editor,
        }: {
          commands: {
            insertContentAt: (pos: number, content: unknown) => boolean;
          };
          editor: import("@tiptap/core").Editor;
        }) => {
          const pos = options.pos ?? editor.state.selection.from;
          return commands.insertContentAt(pos, {
            type: this.name,
            attrs: {
              html: options.html,
              title: options.title ?? null,
            },
          });
        },
    } as Record<string, unknown>;
  },
  parseMarkdown(token: unknown) {
    const payload = parseSerializedNoteWidgetPayload(
      String((token as { content?: string }).content ?? "")
    );
    if (!payload) {
      return {
        type: "noteWidget",
        attrs: {
          html: "",
          title: null,
        },
      };
    }

    return {
      type: "noteWidget",
      attrs: payload,
    };
  },
  renderMarkdown(node: { attrs?: { html?: string; title?: string | null } }) {
    return [
      "```",
      NOTE_WIDGET_TOKEN,
      "\n",
      serializeNoteWidgetPayload({
        html: String(node.attrs?.html ?? ""),
        title: node.attrs?.title ?? null,
      }),
      "\n```",
    ].join("");
  },
  markdownTokenName: "noteWidget",
  markdownTokenizer: {
    name: "noteWidget",
    level: "block",
    start: (src: string) => src.indexOf(`\`\`\`${NOTE_WIDGET_TOKEN}`),
    tokenize(src: string) {
      const match = src.match(/^```avenire-widget\n([\s\S]*?)```(?:\n|$)/);
      if (!match) {
        return undefined;
      }

      return {
        type: "noteWidget",
        raw: match[0],
        content: (match[1] ?? "").trim(),
      };
    },
  },
  addNodeView() {
    return ReactNodeViewRenderer(NoteWidgetNodeView);
  },
});
