"use client";

import { EditorContent } from "@tiptap/react";
import dynamic from "next/dynamic";
import {
  EditorTableOfContentsRail,
  EmptyNoteTemplateActions,
} from "@/components/editor/editor-overlays";
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
    createdBy,
    editor,
    noteTemplates,
    noteTitle,
    onPagePropertiesChange,
    onPropertyDefinitionsChange,
    onTemplateApplied,
    pageProperties,
    propertyDefinitions,
    readOnly,
    recentTemplateIds,
    resolvedEditorUiState,
    setRecentTemplateIds,
    tableOfContentsItems,
    workspaceUuid,
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

      {resolvedEditorUiState.showEmptyTemplateActions ? (
        <EmptyNoteTemplateActions
          createdBy={createdBy}
          editor={editor}
          noteTemplates={noteTemplates}
          noteTitle={noteTitle}
          onTemplateApplied={onTemplateApplied}
          onTemplateUsed={(templateId) =>
            setRecentTemplateIds((current) => [
              templateId,
              ...current.filter((entry) => entry !== templateId),
            ])
          }
          recentTemplateIds={recentTemplateIds}
          workspaceUuid={workspaceUuid}
        />
      ) : null}
    </>
  );
}
