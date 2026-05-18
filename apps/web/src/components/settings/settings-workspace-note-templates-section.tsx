"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import type { NoteTemplateLike } from "@/components/settings/settings-workspace-selected-sections-types";
import {
  DEFAULT_NOTE_TEMPLATE,
  getDefaultNoteTemplates,
} from "@/lib/note-templates";

export function SettingsWorkspaceNoteTemplatesSection({
  noteTemplates,
  openNoteTemplateEditor,
  setNoteTemplates,
}: {
  noteTemplates: NoteTemplateLike[];
  openNoteTemplateEditor: (template: NoteTemplateLike | null) => void;
  setNoteTemplates: (
    updater: (current: NoteTemplateLike[]) => NoteTemplateLike[]
  ) => void;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-medium text-sm">Note templates</p>
          <p className="text-muted-foreground text-xs">
            Templates are stored per workspace and can use note variables when
            you create a new note.
          </p>
        </div>
        <Button
          onClick={() => openNoteTemplateEditor(null)}
          size="sm"
          type="button"
          variant="outline"
        >
          New template
        </Button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {noteTemplates.length === 0 ? (
          <div className="rounded-xl border border-border/60 border-dashed bg-background/60 p-4 text-muted-foreground text-sm">
            No note templates yet. Create one to reuse structure across notes.
          </div>
        ) : (
          noteTemplates.map((template) => (
            <div className="space-y-3 p-0" key={template.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium text-sm">
                    {template.name}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {template.bannerUrl
                      ? "Template banner enabled"
                      : "Markdown template"}
                  </p>
                </div>
                <Badge variant="secondary">Template</Badge>
              </div>
              {template.bannerUrl ? (
                <div
                  className="mt-3 h-24 overflow-hidden rounded-xl border border-border/60 bg-muted/30"
                  style={{
                    backgroundImage: `url(${template.bannerUrl})`,
                    backgroundPosition: "center",
                    backgroundSize: "cover",
                  }}
                />
              ) : null}
              <p className="mt-3 line-clamp-6 whitespace-pre-wrap text-muted-foreground text-xs">
                {template.content}
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  onClick={() => openNoteTemplateEditor(template)}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  Edit
                </Button>
                {template.id !== DEFAULT_NOTE_TEMPLATE.id ? (
                  <Button
                    onClick={() => {
                      setNoteTemplates((current) => {
                        const next = current.filter(
                          (item) => item.id !== template.id
                        );
                        return next.length > 0
                          ? next
                          : getDefaultNoteTemplates();
                      });
                    }}
                    size="sm"
                    type="button"
                    variant="ghost"
                  >
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
