"use client";

import { useEffect, useRef, useState } from "react";
import {
  DEFAULT_NOTE_TEMPLATE,
  getDefaultNoteTemplates,
  getNoteTemplateStorageKey,
  type NoteTemplate,
} from "@/lib/note-templates";

export function useSettingsWorkspaceNoteTemplatesCore({
  activeWorkspaceId,
}: {
  activeWorkspaceId: string;
}) {
  const [noteTemplates, setNoteTemplates] = useState<NoteTemplate[]>([
    DEFAULT_NOTE_TEMPLATE,
  ]);
  const noteTemplatesWorkspaceRef = useRef<string | null>(null);
  const noteTemplatesHydratedRef = useRef(false);

  useEffect(() => {
    const workspaceId = activeWorkspaceId.trim();
    noteTemplatesWorkspaceRef.current = workspaceId || null;
    noteTemplatesHydratedRef.current = false;

    if (!workspaceId) {
      setNoteTemplates(getDefaultNoteTemplates());
      noteTemplatesHydratedRef.current = true;
      return;
    }

    try {
      const raw = window.localStorage.getItem(
        getNoteTemplateStorageKey(workspaceId)
      );
      if (!raw) {
        setNoteTemplates(getDefaultNoteTemplates());
        noteTemplatesHydratedRef.current = true;
        return;
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        setNoteTemplates(getDefaultNoteTemplates());
        return;
      }

      const templates = parsed
        .map((entry) => {
          if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
            return null;
          }

          const candidate = entry as Partial<NoteTemplate>;
          const id =
            typeof candidate.id === "string" ? candidate.id.trim() : "";
          const name =
            typeof candidate.name === "string" ? candidate.name.trim() : "";
          const content =
            typeof candidate.content === "string"
              ? candidate.content
              : DEFAULT_NOTE_TEMPLATE.content;
          const bannerUrl =
            typeof candidate.bannerUrl === "string" &&
            candidate.bannerUrl.trim().length > 0
              ? candidate.bannerUrl.trim()
              : null;
          if (!(id && name)) {
            return null;
          }

          return { id, name, content, bannerUrl } satisfies NoteTemplate;
        })
        .filter((entry): entry is NoteTemplate => Boolean(entry));

      setNoteTemplates(
        templates.length > 0 ? templates : getDefaultNoteTemplates()
      );
      noteTemplatesHydratedRef.current = true;
    } catch {
      setNoteTemplates(getDefaultNoteTemplates());
      noteTemplatesHydratedRef.current = true;
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    const workspaceId = noteTemplatesWorkspaceRef.current;
    if (!(workspaceId && noteTemplatesHydratedRef.current)) {
      return;
    }

    try {
      window.localStorage.setItem(
        getNoteTemplateStorageKey(workspaceId),
        JSON.stringify(noteTemplates)
      );
    } catch {
      return;
    }
  }, [noteTemplates]);

  return {
    noteTemplates,
    setNoteTemplates,
  };
}
