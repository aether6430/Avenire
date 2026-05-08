"use client";

import { syntaxTree } from "@codemirror/language";
import type { Range } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { createRoot, type Root } from "react-dom/client";
import { WidgetRenderer } from "@/components/WidgetRenderer";
import { parseSerializedNoteWidgetPayload } from "@/lib/note-widgets";

const NOTE_WIDGET_TOKEN = "avenire-widget";

function parseFencedCode(
  state: { doc: { sliceString(from: number, to: number): string } },
  node: {
    node: {
      firstChild: {
        name: string;
        from: number;
        to: number;
        nextSibling: typeof node.node.firstChild;
      } | null;
    };
  }
): { info: string; source: string } | undefined {
  let info = "";
  let source = "";

  let child = node.node.firstChild;
  while (child) {
    if (child.name === "CodeInfo") {
      info = state.doc.sliceString(child.from, child.to);
    } else if (child.name === "CodeText") {
      source += state.doc.sliceString(child.from, child.to);
    }
    child = child.nextSibling;
  }

  if (!info) {
    return undefined;
  }
  return { info, source };
}

class NoteWidget extends WidgetType {
  readonly source: string;

  constructor(source: string) {
    super();
    this.source = source;
  }

  eq(other: NoteWidget): boolean {
    return this.source === other.source;
  }

  toDOM(): HTMLElement {
    const payload = parseSerializedNoteWidgetPayload(this.source);
    const wrapper = document.createElement("div");
    wrapper.className = "cm-note-widget";
    wrapper.contentEditable = "false";

    if (!payload) {
      wrapper.textContent = "Invalid Avenire widget";
      return wrapper;
    }

    const root = createRoot(wrapper);
    (wrapper as HTMLElement & { __avenireRoot?: Root }).__avenireRoot = root;
    root.render(
      <div className="cm-note-widget-frame">
        <div className="cm-note-widget-header">
          <div>
            <p className="cm-note-widget-kicker">Interactive widget</p>
            {payload.title ? (
              <p className="cm-note-widget-title">{payload.title}</p>
            ) : null}
          </div>
          <div className="cm-note-widget-badge">Read only</div>
        </div>
        <div className="cm-note-widget-body">
          <WidgetRenderer
            className="rounded-xl border border-border/60 bg-background"
            html={payload.html}
            runScripts
          />
        </div>
      </div>
    );
    return wrapper;
  }

  destroy(dom: HTMLElement): void {
    window.setTimeout(() => {
      (dom as HTMLElement & { __avenireRoot?: Root }).__avenireRoot?.unmount();
    }, 0);
  }
}

const noteWidgetExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }

    build(view: EditorView) {
      const decorations: Range<Decoration>[] = [];
      syntaxTree(view.state).iterate({
        enter(node) {
          if (node.name !== "FencedCode") {
            return;
          }
          const parsed = parseFencedCode(view.state, node);
          if (parsed?.info.trim() !== NOTE_WIDGET_TOKEN) {
            return;
          }
          decorations.push(
            Decoration.replace({
              widget: new NoteWidget(parsed.source.trim()),
              block: true,
              inclusiveStart: true,
            }).range(node.from, node.to)
          );
        },
      });
      return Decoration.set(decorations, true);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = this.build(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations }
);

const noteWidgetTheme = EditorView.baseTheme({
  ".cm-note-widget": {
    margin: "1em 0",
  },
  ".cm-note-widget-frame": {
    overflow: "hidden",
    border: "1px solid var(--border-color)",
    borderRadius: "16px",
    background: "color-mix(in oklch, var(--bg-base) 85%, transparent)",
  },
  ".cm-note-widget-header": {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "0.75rem",
    borderBottom: "1px solid var(--border-color)",
    padding: "0.75rem 1rem",
    fontFamily: "var(--ui-font)",
  },
  ".cm-note-widget-kicker": {
    margin: "0",
    color: "var(--text-muted)",
    fontSize: "0.6875rem",
    fontWeight: "500",
    letterSpacing: "0.24em",
    textTransform: "uppercase",
  },
  ".cm-note-widget-title": {
    margin: "0.15rem 0 0",
    color: "var(--text-primary)",
    fontSize: "0.875rem",
    fontWeight: "500",
  },
  ".cm-note-widget-badge": {
    border: "1px solid var(--border-color)",
    borderRadius: "999px",
    color: "var(--text-muted)",
    fontSize: "0.625rem",
    letterSpacing: "0.18em",
    padding: "0.125rem 0.5rem",
    textTransform: "uppercase",
  },
  ".cm-note-widget-body": {
    padding: "0.75rem",
  },
});

export function noteWidgetDecorations() {
  return [noteWidgetExtension, noteWidgetTheme];
}
