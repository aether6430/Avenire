import { syntaxTree } from "@codemirror/language";
import { type EditorState, RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

const IMAGE_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const CODE_NODE_NAMES = new Set([
  "FencedCode",
  "InlineCode",
  "CodeBlock",
  "CodeText",
  "CodeInfo",
]);

function isInsideCode(state: EditorState, pos: number): boolean {
  let inside = false;
  syntaxTree(state).iterate({
    from: pos,
    to: pos,
    enter(node) {
      if (CODE_NODE_NAMES.has(node.name)) {
        inside = true;
        return false;
      }
    },
  });
  return inside;
}

function selectionTouches(state: EditorState, from: number, to: number) {
  return state.selection.ranges.some(
    (range) => range.from <= to && range.to >= from
  );
}

class ImageWidget extends WidgetType {
  readonly alt: string;
  readonly src: string;

  constructor(src: string, alt: string) {
    super();
    this.src = src;
    this.alt = alt;
  }

  eq(other: ImageWidget): boolean {
    return this.src === other.src && this.alt === other.alt;
  }

  toDOM(): HTMLElement {
    const figure = document.createElement("figure");
    figure.className = "cm-image-widget";
    figure.contentEditable = "false";

    const image = document.createElement("img");
    image.src = this.src;
    image.alt = this.alt;
    image.loading = "lazy";
    figure.append(image);

    if (this.alt) {
      const caption = document.createElement("figcaption");
      caption.textContent = this.alt;
      figure.append(caption);
    }

    return figure;
  }
}

function buildImageDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();

  for (const { from, to } of view.visibleRanges) {
    const text = view.state.doc.sliceString(from, to);
    IMAGE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = IMAGE_RE.exec(text)) !== null) {
      const start = from + match.index;
      const end = start + (match[0]?.length ?? 0);
      if (
        isInsideCode(view.state, start) ||
        selectionTouches(view.state, start, end)
      ) {
        continue;
      }
      builder.add(
        start,
        end,
        Decoration.replace({
          widget: new ImageWidget(match[2] ?? "", match[1] ?? ""),
          block: true,
        })
      );
    }
  }

  return builder.finish();
}

const imageTheme = EditorView.baseTheme({
  ".cm-image-widget": {
    margin: "0.75em 0",
  },
  ".cm-image-widget img": {
    display: "block",
    maxWidth: "100%",
    borderRadius: "8px",
  },
  ".cm-image-widget figcaption": {
    marginTop: "0.35rem",
    color: "var(--text-muted)",
    fontFamily: "var(--ui-font)",
    fontSize: "0.75rem",
  },
});

export function imageDecorations() {
  return [
    ViewPlugin.fromClass(
      class {
        decorations: DecorationSet;

        constructor(view: EditorView) {
          this.decorations = buildImageDecorations(view);
        }

        update(update: ViewUpdate) {
          if (
            update.docChanged ||
            update.viewportChanged ||
            update.selectionSet
          ) {
            this.decorations = buildImageDecorations(update.view);
          }
        }
      },
      { decorations: (plugin) => plugin.decorations }
    ),
    imageTheme,
  ];
}
