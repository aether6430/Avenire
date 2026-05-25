"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { loadFlashcardSetRecord } from "@/components/flashcards/flashcard-set-detail-client";
import { getFlashcardEnrollmentLabel } from "@/components/flashcards/flashcard-set-detail-model";
import { useFlashcardSetDetailEditing } from "@/components/flashcards/use-flashcard-set-detail-editing";
import { writeCachedFlashcardSet } from "@/lib/flashcard-browser-cache";
import type {
  FlashcardReviewQueueItem,
  FlashcardSetRecord,
  FlashcardTaxonomy,
} from "@/lib/flashcards";
import { usePanePathname } from "@/lib/workspace-panes";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";

export function useFlashcardSetDetail({
  initialDrillFilters,
  initialQueue,
  initialSet,
  initialStudyOpen = false,
}: {
  initialDrillFilters: FlashcardTaxonomy[];
  initialQueue?: FlashcardReviewQueueItem[];
  initialSet: FlashcardSetRecord;
  initialStudyOpen?: boolean;
}) {
  const pathname = usePanePathname();
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const [set, setSet] = useState(initialSet);
  const [search, setSearch] = useState("");
  const [drillFilters] = useState(initialDrillFilters);
  const [studyOpen, setStudyOpen] = useState(initialStudyOpen);
  const [studyRefreshToken, setStudyRefreshToken] = useState(0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    recordRoute(pathname);
  }, [pathname, recordRoute]);

  useEffect(() => {
    setSet(initialSet);
    writeCachedFlashcardSet(initialSet);
  }, [initialSet]);

  const snapshotByCardId = useMemo(
    () =>
      new Map(
        set.cardSnapshots.map((snapshot) => [snapshot.card.id, snapshot])
      ),
    [set.cardSnapshots]
  );

  const filteredCards = useMemo(() => {
    const needle = deferredSearch.trim().toLowerCase();
    if (!needle) {
      return set.cards;
    }

    return set.cards.filter((card) => {
      return (
        card.frontMarkdown.toLowerCase().includes(needle) ||
        card.backMarkdown.toLowerCase().includes(needle) ||
        (card.notesMarkdown ?? "").toLowerCase().includes(needle) ||
        card.tags.some((tag) => tag.toLowerCase().includes(needle))
      );
    });
  }, [deferredSearch, set.cards]);

  const setEnrollmentLabel = getFlashcardEnrollmentLabel(
    set.enrollment?.status
  );
  const reviewSummary = `${set.dueCount} due · ${set.newCount} new · ${set.reviewCountToday} studied today`;

  const loadSet = useCallback(async () => {
    const nextSet = await loadFlashcardSetRecord(set.id);
    if (!nextSet) {
      return;
    }

    setSet(nextSet);
    writeCachedFlashcardSet(nextSet);
  }, [set.id]);

  const requestStudySessionRefresh = useCallback(async () => {
    setStudyRefreshToken((value) => value + 1);
  }, []);

  const editingRuntime = useFlashcardSetDetailEditing({
    currentSet: set,
    onRefreshSet: loadSet,
    onRefreshStudySession: requestStudySessionRefresh,
    studyOpen,
  });

  const startReview = useCallback(() => {
    setStudyRefreshToken((value) => value + 1);
    setStudyOpen(true);
  }, []);

  const handleStudyOpenChange = useCallback((open: boolean) => {
    setStudyOpen(open);
  }, []);

  return {
    ...editingRuntime,
    drillFilters,
    filteredCards,
    handleStudyOpenChange,
    initialQueue,
    initialStudyOpen,
    loadSet,
    reviewSummary,
    search,
    set,
    setEnrollmentLabel,
    setSearch,
    snapshotByCardId,
    startReview,
    studyOpen,
    studyRefreshToken,
  };
}

export type FlashcardSetDetailRuntime = ReturnType<
  typeof useFlashcardSetDetail
>;
