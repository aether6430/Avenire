import {
  autocompletion,
  type Completion,
  type CompletionContext,
  type CompletionResult,
} from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import {
  type EditorState,
  type Extension,
  Prec,
  RangeSetBuilder,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

export interface ProsemarkWikiPage {
  content?: string;
  excerpt?: string;
  id: string;
  title: string;
}

export interface ProsemarkWikiOpenOptions {
  openInNewPane: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WIKI_LINK_RE = /\[\[([^\]]+)\]\]/g;

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

/**
 * Extract the wiki-link target text from the line containing `pos`.
 * Searches the whole line for a `[[...]]` token whose range covers `pos`,
 * so it works both when clicking raw text and replace-widget positions.
 */
function extractWikiTarget(
  doc: { lineAt(pos: number): { from: number; text: string } },
  pos: number
): string | null {
  const line = doc.lineAt(pos);
  const text = line.text;

  WIKI_LINK_RE.lastIndex = 0;
  let match;
  while ((match = WIKI_LINK_RE.exec(text)) !== null) {
    const matchStart = line.from + match.index;
    const matchEnd = matchStart + match[0].length;
    if (pos >= matchStart && pos <= matchEnd) {
      return match[1];
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Decorations — fold [[...]] into a clean link widget, unfold when editing
// ---------------------------------------------------------------------------

class WikiLinkWidget extends WidgetType {
  readonly target: string;

  constructor(target: string) {
    super();
    this.target = target;
  }

  eq(other: WikiLinkWidget): boolean {
    return this.target === other.target;
  }

  toDOM(): HTMLElement {
    const span = document.createElement("span");
    span.className = "cm-wiki-link";
    span.textContent = parseWikiLink(this.target).displayText;
    return span;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

const wikiLinkEditingMark = Decoration.mark({ class: "cm-wiki-link-editing" });

function buildDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>();
  const { doc } = view.state;
  const sel = view.state.selection.main;

  for (const { from, to } of view.visibleRanges) {
    const text = doc.sliceString(from, to);
    WIKI_LINK_RE.lastIndex = 0;
    let match;
    while ((match = WIKI_LINK_RE.exec(text)) !== null) {
      const start = from + match.index;
      const end = start + match[0].length;
      if (isInsideCode(view.state, start)) {
        continue;
      }

      const cursorInside = sel.from >= start && sel.to <= end;

      if (cursorInside) {
        // Editing: show raw [[...]] with subtle link color
        builder.add(start, end, wikiLinkEditingMark);
      } else {
        // Folded: replace with clean link text
        builder.add(
          start,
          end,
          Decoration.replace({ widget: new WikiLinkWidget(match[1]) })
        );
      }
    }
  }

  return builder.finish();
}

const wikiLinkDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged || update.selectionSet) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  { decorations: (v) => v.decorations }
);

// ---------------------------------------------------------------------------
// Autocomplete
// ---------------------------------------------------------------------------

function unescapeWikiText(text: string): string {
  return text.replace(/\\\|/g, "|").trim();
}

function splitAlias(raw: string): { target: string; alias: string | null } {
  const separator = raw.indexOf("|");
  if (separator === -1) {
    return { target: raw, alias: null };
  }

  const escapedSeparator = separator > 0 && raw[separator - 1] === "\\";
  const targetEnd = escapedSeparator ? separator - 1 : separator;

  return {
    target: raw.slice(0, targetEnd),
    alias: unescapeWikiText(raw.slice(separator + 1)),
  };
}

function splitFragment(target: string): {
  path: string;
  fragment: string | null;
} {
  const hashIndex = target.indexOf("#");
  if (hashIndex === -1) {
    return { path: target, fragment: null };
  }

  return {
    path: target.slice(0, hashIndex),
    fragment: target.slice(hashIndex + 1),
  };
}

function normalizeWikiTarget(raw: string): string {
  let target = raw.trim().replace(/\\/g, "/");
  target = target.replace(/^\/+/, "");
  const lower = target.toLowerCase();
  if (lower.endsWith(".md")) {
    target = target.slice(0, -3);
  } else if (lower.endsWith(".markdown")) {
    target = target.slice(0, -9);
  }
  return target;
}

function parseWikiLink(raw: string) {
  const { target, alias } = splitAlias(raw.trim());
  const normalizedTarget = unescapeWikiText(target);
  const { path, fragment } = splitFragment(normalizedTarget);
  const normalizedPath = normalizeWikiTarget(path);
  const fallbackDisplay =
    normalizedPath || (fragment ? `#${fragment}` : normalizedTarget);

  return {
    raw,
    target: normalizedTarget,
    path: normalizedPath,
    fragment,
    alias: alias || null,
    displayText: alias || fallbackDisplay,
  };
}

function canonicalWikiTarget(
  page: ProsemarkWikiPage,
  allPages: ProsemarkWikiPage[]
): string {
  const stem = page.title.trim() || page.id;
  const stemLower = stem.toLowerCase();
  const hasDuplicate = allPages.some(
    (candidate) =>
      candidate.id !== page.id &&
      candidate.title.trim().toLowerCase() === stemLower
  );
  return hasDuplicate ? page.id : stem;
}

function createWikiLinkCompletions(
  getWikiPages: () => ProsemarkWikiPage[]
): (context: CompletionContext) => Promise<CompletionResult | null> {
  return async function wikiLinkCompletions(
    context: CompletionContext
  ): Promise<CompletionResult | null> {
    const match = context.matchBefore(/\[\[([^\]#^|]*)/);
    if (!match) {
      return null;
    }

    const queryStart = match.from + 2;
    const query = match.text.slice(2);

    // Stay hidden until the user types at least one non-whitespace character
    if (!query.trim()) {
      return null;
    }
    if (isInsideCode(context.state, match.from)) {
      return null;
    }
    if (!context.state.selection.main.empty) {
      return null;
    }

    const queryLower = query.toLowerCase();
    const results = getWikiPages()
      .filter((page) =>
        `${page.title} ${page.excerpt ?? ""} ${page.content ?? ""}`
          .toLowerCase()
          .includes(queryLower)
      )
      .slice(0, 20);
    if (results.length === 0) {
      return null;
    }

    const options: Completion[] = results.map((r) => {
      const insertText = canonicalWikiTarget(r, results);

      return {
        label: r.title,
        detail: r.excerpt,
        apply(
          view: EditorView,
          _completion: Completion,
          from: number,
          to: number
        ) {
          // Consume a trailing ]] if it immediately follows the cursor
          const afterCursor = view.state.doc.sliceString(to, to + 2);
          const endPos = afterCursor === "]]" ? to + 2 : to;
          const insert = `${insertText}]]`;
          view.dispatch({
            changes: { from, to: endPos, insert },
            selection: { anchor: from + insert.length },
          });
        },
      };
    });

    return {
      from: queryStart,
      options,
      validFor: /^[^\]#^|]*$/,
    };
  };
}

// ---------------------------------------------------------------------------
// Click handling
// ---------------------------------------------------------------------------

function wikiLinkClickHandler(
  getWikiPages: () => ProsemarkWikiPage[],
  onOpenWikiLink?: (
    page: ProsemarkWikiPage,
    options: ProsemarkWikiOpenOptions
  ) => void
): Extension {
  return Prec.highest(
    EditorView.domEventHandlers({
      mousedown(event, view) {
        const eventTarget = event.target;
        if (!(eventTarget instanceof Element)) {
          return false;
        }
        if (!eventTarget.closest(".cm-wiki-link")) {
          return false;
        }

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos === null) {
          return false;
        }

        const rawTarget = extractWikiTarget(view.state.doc, pos);
        if (!rawTarget) {
          return false;
        }

        event.preventDefault();
        event.stopPropagation();

        const parsed = parseWikiLink(rawTarget);
        const normalizedTarget = parsed.path.toLowerCase();
        const page = getWikiPages().find(
          (candidate) =>
            candidate.id.toLowerCase() === normalizedTarget ||
            candidate.title.toLowerCase() === normalizedTarget
        );
        if (page) {
          onOpenWikiLink?.(page, { openInNewPane: event.altKey });
        }

        return true;
      },
    })
  );
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

const wikiLinkTheme = EditorView.baseTheme({
  ".cm-wiki-link": {
    color: "var(--pm-link-color, #7cacf8)",
    cursor: "pointer",
    textDecoration: "none",
  },
  ".cm-wiki-link-editing": {
    color: "var(--pm-link-color, #7cacf8)",
  },
  // Autocomplete tooltip styling — matches the command palette's feel
  ".cm-tooltip-autocomplete": {
    backgroundColor: "var(--surface-palette) !important",
    border: "1px solid var(--line-subtle) !important",
    borderRadius: "12px",
    boxShadow: "0 24px 60px rgba(0, 0, 0, 0.32)",
    overflow: "hidden",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    padding: "4px",
  },
  ".cm-tooltip-autocomplete ul": {
    fontFamily: "var(--ui-font) !important",
    fontSize: "13px",
    maxHeight: "280px",
  },
  ".cm-tooltip-autocomplete ul li": {
    padding: "6px 10px !important",
    borderRadius: "8px",
  },
  ".cm-tooltip-autocomplete ul li[aria-selected]": {
    backgroundColor: "var(--surface-selected) !important",
    color: "inherit",
  },
  ".cm-completionDetail": {
    color: "var(--text-muted, #888) !important",
    fontStyle: "normal !important",
    marginLeft: "8px",
  },
});

// ---------------------------------------------------------------------------
// Public extension
// ---------------------------------------------------------------------------

export function wikiLinkExtension(
  getWikiPages: () => ProsemarkWikiPage[],
  onOpenWikiLink?: (
    page: ProsemarkWikiPage,
    options: ProsemarkWikiOpenOptions
  ) => void
): Extension[] {
  return [
    wikiLinkDecorations,
    wikiLinkClickHandler(getWikiPages, onOpenWikiLink),
    wikiLinkTheme,
    autocompletion({
      override: [createWikiLinkCompletions(getWikiPages)],
      icons: false,
    }),
  ];
}
