"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type ActivityEvent,
  buildMisconceptionFlashcardPrompt,
  buildMisconceptionTutorPrompt,
  type DashboardHomeProps,
  groupDashboardWeakPoints,
} from "@/components/dashboard/dashboard-home-model";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import type { MisconceptionRecord } from "@/lib/learning-data";
import { buildWorkspaceGreeting } from "@/lib/workspace-greeting";
import {
  useCurrentWorkspacePaneCompact,
  useWorkspacePaneNavigation,
} from "@/lib/workspace-panes";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";

export function useDashboardHome({
  activeMisconceptions,
  flashcardSets,
  rootFolderId,
  userName,
  weakestConcepts,
  workspaceId,
}: DashboardHomeProps) {
  const router = useRouter();
  const isCompactPane = useCurrentWorkspacePaneCompact();
  const { navigate } = useWorkspacePaneNavigation();
  const { recordRoute } = usePaneWorkspaceHistoryActions();
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [activityLoadFailed, setActivityLoadFailed] = useState(false);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [selectedMisconception, setSelectedMisconception] =
    useState<MisconceptionRecord | null>(null);

  const greeting = useMemo(() => buildWorkspaceGreeting(userName), [userName]);
  const compactGreeting = `Hey ${userName?.trim() || "there"}`;

  const weakPointGroups = useMemo(
    () => groupDashboardWeakPoints(weakestConcepts, activeMisconceptions),
    [activeMisconceptions, weakestConcepts]
  );

  useEffect(() => {
    recordRoute("/workspace");
  }, [recordRoute]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch("/api/activity?limit=6");
        if (response.ok) {
          const data = (await response.json()) as { events: ActivityEvent[] };
          setActivities(data.events);
          setActivityLoadFailed(false);
        } else {
          setActivities([]);
          setActivityLoadFailed(true);
        }
      } catch {
        setActivities([]);
        setActivityLoadFailed(true);
      } finally {
        setLoadingActivities(false);
      }
    };

    loadActivities().catch(() => undefined);
  }, []);

  const startReview = useCallback(
    (setId: string) => {
      prefetchFlashcardSet(setId).catch(() => undefined);
      startTransition(() => {
        navigate(`/workspace/flashcards/${setId}?study=1`);
      });
    },
    [navigate]
  );

  const openChatsWorkspace = useCallback(() => {
    navigate("/workspace/chats/new");
  }, [navigate]);

  const openFlashcardsWorkspace = useCallback(() => {
    navigate("/workspace/flashcards");
  }, [navigate]);

  const openFilesWorkspace = useCallback(() => {
    navigate(`/workspace/files/${workspaceId}/folder/${rootFolderId}` as Route);
  }, [navigate, rootFolderId, workspaceId]);

  const openMisconceptionTutor = useCallback(
    (misconception: MisconceptionRecord) => {
      navigate(
        `/workspace/chats/new?prompt=${buildMisconceptionTutorPrompt(
          misconception
        )}`
      );
    },
    [navigate]
  );

  const openMisconceptionFlashcards = useCallback(
    (misconception: MisconceptionRecord) => {
      navigate(
        `/workspace/chats/new?prompt=${buildMisconceptionFlashcardPrompt(
          misconception
        )}`
      );
    },
    [navigate]
  );

  const resolveMisconception = useCallback(
    async (misconception: MisconceptionRecord) => {
      const response = await fetch("/api/misconceptions/resolve", {
        body: JSON.stringify({
          concept: misconception.concept,
          subject: misconception.subject,
          topic: misconception.topic,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.ok) {
        setSelectedMisconception(null);
        router.refresh();
      }
    },
    [router]
  );

  const improveMisconception = useCallback(
    async (misconception: MisconceptionRecord) => {
      const response = await fetch("/api/misconceptions/improve", {
        body: JSON.stringify({
          concept: misconception.concept,
          subject: misconception.subject,
          topic: misconception.topic,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (response.ok) {
        setSelectedMisconception(null);
        router.refresh();
      }
    },
    [router]
  );

  return {
    activeMisconceptions,
    activityLoadFailed,
    activities,
    compactGreeting,
    flashcardSets,
    greeting,
    improveMisconception,
    isCompactPane,
    loadingActivities,
    openChatsWorkspace,
    openFilesWorkspace,
    openFlashcardsWorkspace,
    openMisconceptionFlashcards,
    openMisconceptionTutor,
    resolveMisconception,
    selectedMisconception,
    setSelectedMisconception,
    startReview,
    weakPointGroups,
  };
}

export type DashboardHomeRuntime = ReturnType<typeof useDashboardHome>;
