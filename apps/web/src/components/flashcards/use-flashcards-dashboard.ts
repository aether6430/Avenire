"use client";

import type { MisconceptionRecord } from "@avenire/database";
import { useQuery } from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  buildMisconceptionFlashcardPrompt,
  buildMisconceptionTutorPrompt,
} from "@/components/dashboard/dashboard-home-model";
import {
  createFlashcardSet,
  generateFlashcardsOnboardingSet,
} from "@/components/flashcards/flashcards-dashboard-client";
import {
  buildFlashcardSetTags,
  buildOrderedFlashcardSets,
  type FlashcardsDashboardProps,
  findFlashcardsReviewTarget,
  findSelectedFlashcardSet,
  findSelectedFlashcardSnapshots,
} from "@/components/flashcards/flashcards-dashboard-model";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import {
  useCurrentWorkspacePaneCompact,
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";

interface MindsetOverviewPayload {
  activeMisconceptions: MisconceptionRecord[];
}

async function loadMindsetOverview(signal?: AbortSignal) {
  const response = await fetch("/api/workspace/overview", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(
      payload.error?.trim() || "Unable to load misconception memory."
    );
  }

  return (await response.json()) as MindsetOverviewPayload;
}

export function useFlashcardsDashboard({
  generationRequest,
  initialDashboard,
}: FlashcardsDashboardProps) {
  const appRouter = useRouter();
  const router = usePaneRouter();
  const pathname = usePanePathname();
  const searchParams = usePaneSearchParams();
  const isMobile = useCurrentWorkspacePaneCompact();
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const [dashboard] = useState(initialDashboard);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationLoading, setGenerationLoading] = useState(
    generationRequest !== null
  );
  const [busy, setBusy] = useState(false);
  const [selectedMisconception, setSelectedMisconception] =
    useState<MisconceptionRecord | null>(null);
  const autoOpenCreateRef = useRef(false);
  const generationStartedRef = useRef(false);
  const overviewQuery = useQuery({
    queryFn: ({ signal }) => loadMindsetOverview(signal),
    queryKey: ["mindset-overview"],
    staleTime: 30_000,
  });

  const orderedSets = useMemo(
    () => buildOrderedFlashcardSets(dashboard),
    [dashboard]
  );
  const reviewTarget = useMemo(
    () => findFlashcardsReviewTarget(orderedSets),
    [orderedSets]
  );
  const [selectedSetId, setSelectedSetId] = useState<string | null>(
    reviewTarget?.id ?? orderedSets[0]?.id ?? null
  );

  useEffect(() => {
    if (
      selectedSetId &&
      orderedSets.some((candidate) => candidate.id === selectedSetId)
    ) {
      return;
    }

    setSelectedSetId(reviewTarget?.id ?? orderedSets[0]?.id ?? null);
  }, [orderedSets, reviewTarget, selectedSetId]);

  const selectedSet = useMemo(
    () =>
      findSelectedFlashcardSet({
        orderedSets,
        selectedSetId,
      }),
    [orderedSets, selectedSetId]
  );
  const selectedSnapshots = useMemo(
    () =>
      findSelectedFlashcardSnapshots({
        dashboard,
        selectedSetId,
      }),
    [dashboard, selectedSetId]
  );

  useEffect(() => {
    recordRoute(pathname);
  }, [pathname, recordRoute]);

  useEffect(() => {
    if (searchParams.get("create") !== "1" || autoOpenCreateRef.current) {
      return;
    }
    autoOpenCreateRef.current = true;
    setCreateOpen(true);
  }, [searchParams]);

  useEffect(() => {
    if (!generationRequest || generationStartedRef.current) {
      return;
    }
    generationStartedRef.current = true;
    setGenerationLoading(true);
    setGenerationError(null);

    const runGeneration = async () => {
      try {
        const setId = await generateFlashcardsOnboardingSet(generationRequest);
        startTransition(() => {
          router.replace(`/workspace/flashcards/${setId}` as Route);
        });
      } catch (error) {
        setGenerationError(
          error instanceof Error ? error.message : "Unable to generate mindset."
        );
        setGenerationLoading(false);
      }
    };

    runGeneration().catch(() => undefined);
  }, [generationRequest, router]);

  const createSet = async () => {
    setBusy(true);
    setCreateStatus(null);
    try {
      const result = await createFlashcardSet({
        description,
        tags: buildFlashcardSetTags(tags),
        title,
      });

      if (!result.setId) {
        setCreateStatus(result.status);
        return;
      }

      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setTags("");
      setCreateStatus(null);
      startTransition(() => {
        router.push(`/workspace/flashcards/${result.setId}` as Route);
      });
    } finally {
      setBusy(false);
    }
  };

  const openSet = (setId: string) => {
    router.push(`/workspace/flashcards/${setId}` as Route);
  };

  const openReviewTarget = () => {
    if (!reviewTarget) {
      return;
    }
    openSet(reviewTarget.id);
  };

  const prefetchSet = (setId: string) => {
    prefetchFlashcardSet(setId).catch(() => undefined);
  };

  const openMisconceptionTutor = (misconception: MisconceptionRecord) => {
    router.push(
      `/workspace/chats/new?prompt=${buildMisconceptionTutorPrompt(
        misconception
      )}` as Route
    );
  };

  const openMisconceptionFlashcards = (misconception: MisconceptionRecord) => {
    router.push(
      `/workspace/chats/new?prompt=${buildMisconceptionFlashcardPrompt(
        misconception
      )}` as Route
    );
  };

  const adjustMisconceptionConfidence = async (
    misconception: MisconceptionRecord,
    delta: number
  ) => {
    const response = await fetch("/api/misconceptions/improve", {
      body: JSON.stringify({
        concept: misconception.concept,
        delta,
        subject: misconception.subject,
        topic: misconception.topic,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    await overviewQuery.refetch();
    appRouter.refresh();
    setSelectedMisconception({
      ...misconception,
      confidence: Math.min(1, Math.max(0, misconception.confidence + delta)),
    });
  };

  const clearMisconception = async (misconception: MisconceptionRecord) => {
    const response = await fetch("/api/misconceptions/delete", {
      body: JSON.stringify({
        concept: misconception.concept,
        subject: misconception.subject,
        topic: misconception.topic,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      return;
    }

    setSelectedMisconception(null);
    await overviewQuery.refetch();
    appRouter.refresh();
  };

  return {
    activeMisconceptions: overviewQuery.data?.activeMisconceptions ?? [],
    adjustMisconceptionConfidence,
    busy,
    clearMisconception,
    createOpen,
    createSet,
    createStatus,
    dashboard,
    description,
    generationError,
    generationLoading,
    isMobile,
    mindsetOverviewErrorMessage:
      overviewQuery.error instanceof Error ? overviewQuery.error.message : null,
    mindsetOverviewLoading: overviewQuery.isLoading,
    openMisconceptionFlashcards,
    openMisconceptionTutor,
    openReviewTarget,
    openSet,
    orderedSets,
    prefetchSet,
    reviewTarget,
    selectedMisconception,
    selectedSet,
    selectedSetId,
    selectedSnapshots,
    setCreateOpen,
    setDescription,
    setSelectedMisconception,
    setSelectedSetId,
    setTags,
    setTitle,
    tags,
    title,
  };
}

export type FlashcardsDashboardRuntime = ReturnType<
  typeof useFlashcardsDashboard
>;
