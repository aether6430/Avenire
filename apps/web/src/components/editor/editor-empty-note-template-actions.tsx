"use client";

import { Button } from "@avenire/ui/components/button";
import type { Editor } from "@tiptap/react";
import { useMemo } from "react";
import {
  insertMarkdownContent,
  persistRecentTemplate,
} from "@/components/editor/editor-core";
import { renderMarkdownNoteTemplate } from "@/lib/markdown-note-template";
import type { NoteTemplate } from "@/lib/note-templates";

export function EmptyNoteTemplateActions({
  createdBy,
  editor,
  noteTemplates,
  noteTitle,
  onTemplateApplied,
  onTemplateUsed,
  recentTemplateIds,
  workspaceUuid,
}: {
  createdBy?: string;
  editor: Editor;
  noteTemplates: NoteTemplate[];
  noteTitle: string;
  onTemplateApplied?: (template: NoteTemplate, rendered: string) => void;
  onTemplateUsed: (templateId: string) => void;
  recentTemplateIds: string[];
  workspaceUuid: string;
}) {
  const templateChoices = useMemo(() => {
    const byId = new Map(
      noteTemplates.map((template) => [template.id, template])
    );
    const recent = recentTemplateIds
      .map((id) => byId.get(id) ?? null)
      .filter((template): template is NoteTemplate => Boolean(template));
    const fallback = noteTemplates.filter(
      (template) => !recent.some((entry) => entry.id === template.id)
    );
    return [...recent, ...fallback].slice(0, 3);
  }, [noteTemplates, recentTemplateIds]);

  if (templateChoices.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none sticky bottom-24 z-20 mt-10 flex justify-center px-4">
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
        {templateChoices.map((template) => (
          <Button
            className="rounded-full shadow-sm"
            key={template.id}
            onClick={() => {
              const rendered = renderMarkdownNoteTemplate(template.content, {
                createdBy,
                title: noteTitle,
              });
              insertMarkdownContent(editor, rendered);
              editor.commands.focus("end");
              onTemplateApplied?.(template, rendered);
              persistRecentTemplate(workspaceUuid, template.id);
              onTemplateUsed(template.id);
            }}
            size="sm"
            type="button"
            variant="secondary"
          >
            {template.name}
          </Button>
        ))}
      </div>
    </div>
  );
}
