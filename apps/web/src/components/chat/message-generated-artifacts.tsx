"use client";

import { buttonVariants } from "@avenire/ui/components/button";
import { ArrowSquareOut } from "@phosphor-icons/react";
import { useEffect, useMemo, useState } from "react";
import type {
  CompletedToolPart,
  FlashcardToolOutput,
  NoteToolOutput,
  ToolPart,
} from "@/components/chat/message-model";
import { cn } from "@/lib/utils";
import { resolveWorkspaceFileRoute } from "@/lib/workspace-file-navigation";

export function MessageGeneratedArtifacts({
  parts,
  workspaceUuid,
}: {
  parts: ToolPart[];
  workspaceUuid: string;
}) {
  const generatedFlashcards = useMemo(
    () =>
      parts
        .filter(
          (part): part is CompletedToolPart =>
            part.type === "tool-generate_flashcards" &&
            part.state === "output-available"
        )
        .map((part) => {
          const output = part.output as FlashcardToolOutput;
          return {
            cardCount: Array.isArray(output.cards) ? output.cards.length : 0,
            setId: output.setId,
            title: output.title,
          };
        })
        .filter((item) => item.cardCount > 0),
    [parts]
  );

  const generatedNotes = useMemo(
    () =>
      parts
        .filter(
          (part): part is CompletedToolPart =>
            part.type === "tool-note_agent" && part.state === "output-available"
        )
        .flatMap((part) => {
          const output = part.output as NoteToolOutput;
          return Array.isArray(output.notes)
            ? output.notes
                .map((note) => ({
                  fileId: note.fileId,
                  title: note.title,
                  workspacePath: note.workspacePath,
                }))
                .filter((note) => typeof note.fileId === "string")
            : [];
        }),
    [parts]
  );

  const [noteRoutes, setNoteRoutes] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;

    const missingRoutes = generatedNotes.filter(
      (note) => noteRoutes[note.fileId] === undefined
    );
    if (missingRoutes.length === 0 || !workspaceUuid) {
      return;
    }

    for (const note of missingRoutes) {
      void resolveWorkspaceFileRoute(workspaceUuid, note.fileId)
        .then((route) => {
          if (cancelled) {
            return;
          }
          setNoteRoutes((current) => ({
            ...current,
            [note.fileId]: route,
          }));
        })
        .catch(() => {
          if (cancelled) {
            return;
          }
          setNoteRoutes((current) => ({
            ...current,
            [note.fileId]: null,
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [generatedNotes, noteRoutes, workspaceUuid]);

  if (generatedNotes.length === 0 && generatedFlashcards.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {generatedFlashcards.map((mindsetSet) => (
        <a
          className={cn(
            buttonVariants({ size: "sm", variant: "outline" }),
            "gap-1.5"
          )}
          href={`/workspace/flashcards/${mindsetSet.setId}`}
          key={mindsetSet.setId}
        >
          <span>Open mindset set</span>
          <span className="max-w-[18rem] truncate text-foreground/70">
            {mindsetSet.title}
          </span>
          <span className="text-foreground/40">({mindsetSet.cardCount})</span>
          <ArrowSquareOut className="size-3.5" />
        </a>
      ))}
      {generatedNotes.map((note) => {
        const route = noteRoutes[note.fileId];
        if (!route) {
          return null;
        }

        return (
          <a
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "gap-1.5"
            )}
            href={route}
            key={note.fileId}
          >
            <span>Open note</span>
            <span className="max-w-[18rem] truncate text-foreground/70">
              {note.title ?? note.workspacePath}
            </span>
            <ArrowSquareOut className="size-3.5" />
          </a>
        );
      })}
    </div>
  );
}
