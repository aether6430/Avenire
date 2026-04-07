"use client";

import type { FlashcardDashboardRecord } from "@/lib/flashcards";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { FlashcardsDashboard } from "@/components/flashcards/dashboard";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";

interface FlashcardsDashboardPayload {
  dashboard: FlashcardDashboardRecord;
}

interface FlashcardGenerationRequest {
  concept: string;
  count: number;
  reason: string;
  subject: string;
  title?: string;
  topic: string;
}

async function loadFlashcardsDashboard(signal?: AbortSignal) {
  const response = await fetch("/api/flashcards/dashboard", {
    cache: "no-store",
    signal,
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to load flashcards dashboard.");
  }

  return (await response.json()) as FlashcardsDashboardPayload;
}

export function WorkspaceFlashcardsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const dashboardQuery = useQuery({
    enabled: status === "ready" && Boolean(user?.id && workspace?.workspaceId),
    queryFn: ({ signal }) => loadFlashcardsDashboard(signal),
    queryKey: ["flashcards-dashboard", workspace?.workspaceId ?? null],
  });

  useEffect(() => {
    if (dashboardQuery.data === null) {
      router.replace("/workspace");
    }
  }, [dashboardQuery.data, router]);

  const generationRequest: FlashcardGenerationRequest | null =
    searchParams.get("generate") === "onboarding"
      ? {
          concept: searchParams.get("concept")?.trim() || "Concept check",
          count: 5,
          reason:
            searchParams.get("reason")?.trim() ||
            "This concept surfaced during onboarding.",
          subject: searchParams.get("subject")?.trim() || "General",
          title: searchParams.get("title")?.trim() || undefined,
          topic: searchParams.get("topic")?.trim() || "Review",
        }
      : null;

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading flashcards..." />;
  }

  if (dashboardQuery.isPending || !dashboardQuery.data?.dashboard) {
    return <WorkspaceRoutePlaceholder label="Loading flashcards..." />;
  }

  return (
    <FlashcardsDashboard
      generationRequest={generationRequest}
      initialDashboard={dashboardQuery.data.dashboard}
    />
  );
}
