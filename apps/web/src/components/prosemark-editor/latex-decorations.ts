import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Decoration, EditorView, WidgetType } from "@codemirror/view";
import {
  foldableSyntaxFacet,
  mathDelimiterTag,
  mathFormulaTag,
  selectAllDecorationsOnSelectExtension,
} from "@prosemark/core";
import katex from "katex";
import "katex/dist/katex.min.css";

const WIDGET_CLASS = "cm-latex-math";

class LatexMathWidget extends WidgetType {
  readonly display: boolean;
  readonly tex: string;

  constructor(tex: string, display: boolean) {
    super();
    this.tex = tex;
    this.display = display;
  }

  eq(other: LatexMathWidget): boolean {
    return this.tex === other.tex && this.display === other.display;
  }

  get estimatedHeight() {
    return this.display ? 72 : -1;
  }

  toDOM(): HTMLElement {
    const wrapper = document.createElement(this.display ? "div" : "span");
    wrapper.className = WIDGET_CLASS;
    wrapper.setAttribute("data-display", this.display ? "block" : "inline");
    wrapper.setAttribute("data-latex", this.tex);

    try {
      katex.render(this.tex, wrapper, {
        displayMode: this.display,
        output: "html",
        throwOnError: false,
      });
    } catch (error) {
      wrapper.textContent = this.tex;
      wrapper.title = error instanceof Error ? error.message : String(error);
      wrapper.classList.add(`${WIDGET_CLASS}-error`);
    }

    return wrapper;
  }

  ignoreEvent() {
    return false;
  }
}

const latexFoldExtension = foldableSyntaxFacet.of({
  nodePath: "Math",
  buildDecorations: (state, node) => {
    const opensDouble =
      state.doc.sliceString(node.from, node.from + 2) === "$$";
    const innerFrom = opensDouble ? node.from + 2 : node.from + 1;
    const innerTo = opensDouble ? node.to - 2 : node.to - 1;
    const body = state.doc.sliceString(innerFrom, innerTo);
    const tex = body.trim();
    if (!tex) {
      return undefined;
    }

    const display = opensDouble || /^\s|\s$/.test(body);
    return Decoration.replace({
      widget: new LatexMathWidget(tex, display),
      block: display,
      inclusive: true,
      proseMarkSkipAdjacentArrowReveal: true,
    }).range(node.from, node.to);
  },
});

const latexSyntaxTheme = [
  syntaxHighlighting(
    HighlightStyle.define([
      {
        tag: mathDelimiterTag,
        class: "cm-latex-math-delimiter",
      },
      {
        tag: mathFormulaTag,
        class: "cm-latex-math-formula",
      },
    ])
  ),
  EditorView.theme({
    ".cm-latex-math-delimiter": {
      color: "var(--pm-latex-math-delimiter-color, var(--pm-link-color))",
    },
    ".cm-latex-math-formula": {
      color: "var(--pm-latex-math-formula-color, inherit)",
      fontFamily: "var(--pm-code-font)",
      fontSize: "0.92em",
    },
  }),
];

const latexWidgetTheme = EditorView.theme({
  [`.${WIDGET_CLASS}`]: {
    display: "inline-block",
    verticalAlign: "middle",
  },
  [`.${WIDGET_CLASS}[data-display="block"]`]: {
    display: "block",
    padding: "0.5em 0",
    textAlign: "center",
  },
  [`.${WIDGET_CLASS}-error`]: {
    color: "var(--text-error)",
    fontFamily: "var(--pm-code-font)",
  },
});

export function latexDecorations() {
  return [
    ...latexSyntaxTheme,
    latexFoldExtension,
    latexWidgetTheme,
    selectAllDecorationsOnSelectExtension(WIDGET_CLASS),
  ];
}
