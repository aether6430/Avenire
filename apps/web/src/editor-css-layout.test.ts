import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const editorCss = readFileSync(resolve(import.meta.dirname, "./editor.css"), {
  encoding: "utf8",
});
const editorExtensions = readFileSync(
  resolve(import.meta.dirname, "./components/editor/editor-extensions.ts"),
  {
    encoding: "utf8",
  }
);
const editorDocumentBody = readFileSync(
  resolve(import.meta.dirname, "./components/editor/editor-document-body.tsx"),
  {
    encoding: "utf8",
  }
);
const editorSelectionBubbleMenu = readFileSync(
  resolve(
    import.meta.dirname,
    "./components/editor/editor-selection-bubble-menu.tsx"
  ),
  {
    encoding: "utf8",
  }
);
const editorPropertiesTable = readFileSync(
  resolve(import.meta.dirname, "./components/editor/properties-table.tsx"),
  {
    encoding: "utf8",
  }
);

describe("editor.css responsive note layout", () => {
  it("keeps frontmatter rows away from the mobile viewport edge", () => {
    expect(editorCss).toContain(".scribe-frontmatter-panel");
    expect(editorCss).toContain("padding-inline: clamp(1rem, 4vw, 1.25rem);");
    expect(editorCss).toContain("padding-inline: clamp(1rem, 3vw, 3rem);");
    expect(editorCss).toContain("overflow: visible;");
    expect(editorCss).toContain(
      '.scribe-frontmatter-table :where(input, button, [role="button"])'
    );
    expect(editorPropertiesTable).toContain("sm:-mx-3 sm:px-3");
    expect(editorPropertiesTable).not.toContain('className="group -mx-3');
    expect(editorCss).not.toContain("max-height: 12.5rem;");
  });

  it("anchors the table of contents rail to the editor grid and uses the compact hover panel layout", () => {
    expect(editorCss).toContain(".editor-toc-rail");
    expect(editorCss).toContain("grid-column: 1;");
    expect(editorCss).toContain("grid-row: 1;");
    expect(editorCss).toContain("justify-self: end;");
    expect(editorCss).toContain(".editor-toc-rail__panel");
    expect(editorCss).toContain("right: 0;");
    expect(editorCss).toContain("left: auto;");
    expect(editorCss).toContain("margin-right: clamp(0.25rem, 1.6vw, 2rem);");
    expect(editorCss).toContain("width: 2rem;");
    expect(editorCss).toContain("overflow: visible;");
    expect(editorCss).toContain("border: 1px solid var(--border);");
    expect(editorCss).toContain("pointer-events: none;");
    expect(editorCss).toContain("pointer-events: auto;");
    expect(editorCss).not.toContain(
      "width: min(15.25rem, calc(100vw - 2rem));"
    );
    expect(editorCss).toContain(".scribe-document-row");
    expect(editorCss).toContain("grid-template-columns: minmax(3.125rem, 1fr)");
    expect(editorCss).toContain("grid-column: 2;");
  });

  it("uses the richer code block controls strip and treats workspace-file links as interactive", () => {
    expect(editorCss).toContain(".scribe-codeblock-controls");
    expect(editorCss).toContain(".scribe-codeblock-language");
    expect(editorCss).toContain(".scribe-codeblock-button");
    expect(editorCss).toContain("padding-top: 2.75rem;");
    expect(editorCss).toContain("pointer-events: none;");
    expect(editorCss).toContain('a[href^="workspace-file://"]');
    expect(editorCss).toContain("cursor: pointer;");
  });

  it("supports icon-based mermaid controls with reset and expanded-view affordances", () => {
    expect(editorExtensions).toContain("const MERMAID_ICON_SVG");
    expect(editorExtensions).toContain("MERMAID_ICON_SVG.zoomIn");
    expect(editorExtensions).toContain("MERMAID_ICON_SVG.zoomOut");
    expect(editorExtensions).toContain("MERMAID_ICON_SVG.reset");
    expect(editorExtensions).toContain("MERMAID_ICON_SVG.full");
    expect(editorExtensions).toContain(
      'wrapper.classList.toggle("is-expanded")'
    );
    expect(editorCss).toContain(".mermaid-diagram-wrapper.is-expanded");
    expect(editorCss).toContain(
      ".mermaid-diagram-zoom-button:nth-child(n + 3)"
    );
    expect(editorCss).toContain("min-width: 2rem;");
    expect(editorCss).toContain("shape-rendering: geometricPrecision;");
    expect(editorCss).toContain("text-rendering: geometricPrecision;");
  });

  it("renders sticky document stats beside the editor body", () => {
    expect(editorDocumentBody).toContain('className="scribe-document-stats"');
    expect(editorDocumentBody).toContain(
      "documentStats.words.toLocaleString()"
    );
    expect(editorDocumentBody).toContain(
      "documentStats.characters.toLocaleString()"
    );
    expect(editorDocumentBody).toContain(
      "documentStats.paragraphs.toLocaleString()"
    );
    expect(editorCss).toContain(".scribe-document-stats");
    expect(editorCss).toContain("position: sticky;");
    expect(editorCss).toContain("justify-content: flex-end;");
  });

  it("threads page summarization into the frontmatter properties table", () => {
    expect(editorDocumentBody).toContain(
      "onSummarizePage={summarizeCurrentPage}"
    );
  });

  it("keeps the selection bubble AI tools menu with proofread and improve actions", () => {
    expect(editorSelectionBubbleMenu).toContain('title="AI tools"');
    expect(editorSelectionBubbleMenu).toContain('"improve", "Improve writing"');
    expect(editorSelectionBubbleMenu).toContain('"proofread", "Proofread"');
    expect(editorSelectionBubbleMenu).toContain("replaceRangeWithMarkdown");
    expect(editorSelectionBubbleMenu).toContain(
      "aiPendingRange ?? editor.state.selection"
    );
  });
});
