"use client";

import type { Route } from "next";
import { useCallback, useEffect, useState } from "react";
import {
  archiveFlashcardSetCard,
  deleteFlashcardSetRecord,
  saveFlashcardSetCard,
  toggleFlashcardSetEnrollment,
  updateFlashcardSetMetadata,
} from "@/components/flashcards/flashcard-set-detail-client";
import { readFlashcardTaxonomyField } from "@/components/flashcards/flashcard-set-detail-model";
import type { FlashcardCardRecord, FlashcardSetRecord } from "@/lib/flashcards";
import { usePaneRouter } from "@/lib/workspace-panes";

export function useFlashcardSetDetailEditing({
  currentSet,
  onRefreshSet,
  onRefreshStudySession,
  studyOpen,
}: {
  currentSet: FlashcardSetRecord;
  onRefreshSet: () => Promise<void>;
  onRefreshStudySession: () => Promise<void>;
  studyOpen: boolean;
}) {
  const router = usePaneRouter();
  const [editorOpen, setEditorOpen] = useState(false);
  const [setMetadataEditorOpen, setSetMetadataEditorOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<FlashcardCardRecord | null>(
    null
  );
  const [setTitle, setSetTitle] = useState(currentSet.title);
  const [setDescription, setSetDescription] = useState(
    currentSet.description ?? ""
  );
  const [frontMarkdown, setFrontMarkdown] = useState("");
  const [backMarkdown, setBackMarkdown] = useState("");
  const [notesMarkdown, setNotesMarkdown] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [concept, setConcept] = useState("");
  const [tags, setTags] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSetTitle(currentSet.title);
    setSetDescription(currentSet.description ?? "");
  }, [currentSet.description, currentSet.title]);

  const refreshAfterMutation = useCallback(async () => {
    await Promise.all([
      onRefreshSet(),
      studyOpen ? onRefreshStudySession() : Promise.resolve(),
    ]);
  }, [onRefreshSet, onRefreshStudySession, studyOpen]);

  const openEditor = useCallback((card?: FlashcardCardRecord) => {
    setEditingCard(card ?? null);
    setFrontMarkdown(card?.frontMarkdown ?? "");
    setBackMarkdown(card?.backMarkdown ?? "");
    setNotesMarkdown(card?.notesMarkdown ?? "");
    setSubject(card ? readFlashcardTaxonomyField(card.source, "subject") : "");
    setTopic(card ? readFlashcardTaxonomyField(card.source, "topic") : "");
    setConcept(card ? readFlashcardTaxonomyField(card.source, "concept") : "");
    setTags(card?.tags.join(", ") ?? "");
    setEditorOpen(true);
  }, []);

  const saveSet = useCallback(async () => {
    setBusy(true);
    try {
      const success = await updateFlashcardSetMetadata({
        description: setDescription,
        setId: currentSet.id,
        title: setTitle,
      });
      if (!success) {
        return;
      }

      setSetMetadataEditorOpen(false);
      await onRefreshSet();
    } finally {
      setBusy(false);
    }
  }, [currentSet.id, onRefreshSet, setDescription, setTitle]);

  const deleteSet = useCallback(async () => {
    if (
      !window.confirm(
        `Delete "${currentSet.title}"? This will archive the set.`
      )
    ) {
      return;
    }

    setBusy(true);
    try {
      const success = await deleteFlashcardSetRecord(currentSet.id);
      if (!success) {
        return;
      }

      router.push("/workspace/flashcards" as Route);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }, [currentSet.id, currentSet.title, router]);

  const saveCard = useCallback(async () => {
    setBusy(true);
    try {
      const success = await saveFlashcardSetCard({
        backMarkdown,
        cardId: editingCard?.id,
        concept,
        editingSource: editingCard?.source,
        frontMarkdown,
        notesMarkdown,
        setId: currentSet.id,
        subject,
        tags: tags
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        topic,
      });
      if (!success) {
        return;
      }

      setEditorOpen(false);
      setEditingCard(null);
      await refreshAfterMutation();
    } finally {
      setBusy(false);
    }
  }, [
    backMarkdown,
    concept,
    currentSet.id,
    editingCard?.id,
    editingCard?.source,
    frontMarkdown,
    notesMarkdown,
    refreshAfterMutation,
    subject,
    tags,
    topic,
  ]);

  const archiveCard = useCallback(
    async (cardId: string) => {
      setBusy(true);
      try {
        const success = await archiveFlashcardSetCard(cardId);
        if (!success) {
          return;
        }

        await refreshAfterMutation();
      } finally {
        setBusy(false);
      }
    },
    [refreshAfterMutation]
  );

  const toggleEnrollment = useCallback(async () => {
    setBusy(true);
    try {
      const success = await toggleFlashcardSetEnrollment({
        newCardsPerDay: currentSet.enrollment?.newCardsPerDay ?? 20,
        setId: currentSet.id,
        status:
          currentSet.enrollment?.status === "active" ? "paused" : "active",
      });
      if (!success) {
        return;
      }

      await refreshAfterMutation();
    } finally {
      setBusy(false);
    }
  }, [
    currentSet.enrollment?.newCardsPerDay,
    currentSet.enrollment?.status,
    currentSet.id,
    refreshAfterMutation,
  ]);

  return {
    archiveCard,
    backMarkdown,
    busy,
    concept,
    deleteSet,
    editorOpen,
    editingCard,
    frontMarkdown,
    notesMarkdown,
    openEditor,
    saveCard,
    saveSet,
    setBackMarkdown,
    setConcept,
    setDescription: setSetDescription,
    setDescriptionValue: setDescription,
    setEditorOpen,
    setFrontMarkdown,
    setMetadataEditorOpen: setSetMetadataEditorOpen,
    setMetadataEditorOpenValue: setMetadataEditorOpen,
    setNotesMarkdown,
    setSubject,
    setTags,
    setTitle: setSetTitle,
    setTitleValue: setTitle,
    setTopic,
    subject,
    tags,
    toggleEnrollment,
    topic,
  };
}

export type FlashcardSetDetailEditingRuntime = ReturnType<
  typeof useFlashcardSetDetailEditing
>;
