"use client";

import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import type { ConceptDrillTarget, ConceptMasteryRecord, FlashcardSetSummary } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";

interface WorkspaceOverviewPayload {
  activeMisconceptions: MisconceptionRecord[];
  flashcardSets: FlashcardSetSummary[];
  weakestConcepts: ConceptMasteryRecord[];
  weakestDrillTarget: ConceptDrillTarget | null;
}

async function loadWorkspaceOverview(subject?: string | null, signal?: AbortSignal) {
  const url = new URL("/api/workspace/overview", window.location.origin);
  if (subject?.trim()) {
    url.searchParams.set("subject", subject.trim());
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load workspace overview.");
  }

  return (await response.json()) as WorkspaceOverviewPayload;
}

export function WorkspaceOverviewPageClient() {
  const searchParams = useSearchParams();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const requestedSubject = searchParams.get("subject");
  const overviewQuery = useQuery({
    enabled: status === "ready" && Boolean(user?.id && workspace?.workspaceId),
    queryFn: ({ signal }) => loadWorkspaceOverview(requestedSubject, signal),
    queryKey: [
      "workspace-overview",
      workspace?.workspaceId ?? null,
      requestedSubject?.trim().toLowerCase() ?? "",
    ],
  });

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder />;
  }

  if (overviewQuery.isPending || !overviewQuery.data) {
    return <WorkspaceRoutePlaceholder label="Loading workspace..." />;
  }

  return (
    <DashboardHome
      activeMisconceptions={overviewQuery.data.activeMisconceptions}
      currentUserId={user.id}
      flashcardSets={overviewQuery.data.flashcardSets}
      userName={user.name ?? undefined}
      weakestConcepts={overviewQuery.data.weakestConcepts}
      weakestDrillTarget={overviewQuery.data.weakestDrillTarget}
      workspaceId={workspace.workspaceId}
    />
  );
}
