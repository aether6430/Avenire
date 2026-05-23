"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import type { FlashcardsDashboardProps } from "@/components/flashcards/flashcards-dashboard-model";
import { FlashcardsDashboardSurface } from "@/components/flashcards/flashcards-dashboard-surface";
import { useFlashcardsDashboard } from "@/components/flashcards/use-flashcards-dashboard";
import type { FlashcardDashboardRecord } from "@/lib/flashcards";
import { usePaneSearchParams } from "@/lib/workspace-panes";

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

function ReadyFlashcardsDashboard(props: FlashcardsDashboardProps) {
  const runtime = useFlashcardsDashboard(props);

  return <FlashcardsDashboardSurface runtime={runtime} />;
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
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error?.trim() || "Unable to load Mindset Sets.");
  }

  return (await response.json()) as FlashcardsDashboardPayload;
}

export function WorkspaceFlashcardsPageClient() {
  const searchParams = usePaneSearchParams();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const dashboardQuery = useQuery({
    enabled: status === "ready" && Boolean(user?.id && workspace?.workspaceId),
    queryFn: ({ signal }) => loadFlashcardsDashboard(signal),
    queryKey: ["flashcards-dashboard", workspace?.workspaceId ?? null],
  });

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

  if (status === "error") {
    return (
      <WorkspaceRoutePlaceholder
        label="Unable to load Mindset Sets."
        pending={false}
      />
    );
  }

  if (status === "ready" && user && !workspace) {
    return (
      <WorkspaceRoutePlaceholder
        label="Create a workspace to continue."
        pending={false}
      />
    );
  }

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading Mindset Sets..." />;
  }

  if (dashboardQuery.isError) {
    return (
      <WorkspaceRoutePlaceholder
        label={
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "Unable to load Mindset Sets."
        }
        pending={false}
      />
    );
  }

  if (dashboardQuery.data === null) {
    return (
      <WorkspaceRoutePlaceholder
        label="Mindset Sets unavailable."
        pending={false}
      />
    );
  }

  if (dashboardQuery.isPending || !dashboardQuery.data?.dashboard) {
    return <WorkspaceRoutePlaceholder label="Loading Mindset Sets..." />;
  }

  return (
    <ReadyFlashcardsDashboard
      generationRequest={generationRequest}
      initialDashboard={dashboardQuery.data.dashboard}
    />
  );
}
