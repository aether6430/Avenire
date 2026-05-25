"use client";

import { EditorContent } from "@tiptap/react";
import dynamic from "next/dynamic";
import { EditorTableOfContentsRail } from "@/components/editor/editor-table-of-contents-rail";
import type { PropertiesTableProps } from "@/components/editor/properties-table";
import type { AvenireEditorRuntime } from "@/components/use-avenire-editor";

const PropertiesTable = dynamic<PropertiesTableProps>(
  () =>
    import("@/components/editor/properties-table").then(
      (module) => module.PropertiesTable
    ),
  { loading: () => null, ssr: false }
);

export function EditorDocumentBody({
  runtime,
}: {
  runtime: AvenireEditorRuntime;
}) {
  const {
    documentStats,
    editor,
    onPagePropertiesChange,
    onPropertyDefinitionsChange,
    pageProperties,
    propertyDefinitions,
    readOnly,
    summarizeCurrentPage,
    tableOfContentsItems,
  } = runtime;

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className="scribe-frontmatter-panel scroll-fade-frame scroll-fade-bottom">
        <PropertiesTable
          className="scribe-frontmatter-table"
          definitions={propertyDefinitions}
          disabled={readOnly}
          onChange={(properties) => onPagePropertiesChange?.(properties)}
          onDefinitionsChange={onPropertyDefinitionsChange}
          onSummarizePage={summarizeCurrentPage}
          properties={pageProperties}
        />
      </div>

      <div className="scribe-document-row">
        <EditorContent
          className="scribe-editor-content [&_.ProseMirror-focused]:outline-none"
          editor={editor}
        />
        <EditorTableOfContentsRail items={tableOfContentsItems} />
      </div>

      <div aria-live="polite" className="scribe-document-stats">
        <span>{documentStats.words.toLocaleString()} words</span>
        <span>{documentStats.characters.toLocaleString()} characters</span>
        <span>{documentStats.paragraphs.toLocaleString()} paragraphs</span>
      </div>
    </>
  );
}
