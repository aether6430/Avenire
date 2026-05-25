"use client";

import type { MisconceptionRecord } from "@avenire/database";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import type { DashboardHomeProps } from "@/components/dashboard/dashboard-home-model";
import { useDashboardHome } from "@/components/dashboard/use-dashboard-home";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import type {
  ConceptDrillTarget,
  ConceptMasteryRecord,
  FlashcardSetSummary,
} from "@/lib/flashcards";
import { usePaneSearchParams } from "@/lib/workspace-panes";
import type { DashboardHomeRuntime } from "./use-dashboard-home";

const DashboardHomeSurface = dynamic<
  Pick<
    DashboardHomeProps,
    "currentUserId" | "weakestDrillTarget" | "workspaceId"
  > & {
    runtime: DashboardHomeRuntime;
  }
>(
  () =>
    import("@/components/dashboard/dashboard-home-surface").then(
      (module) => module.DashboardHomeSurface
    ),
  { loading: () => null }
);

interface WorkspaceOverviewPayload {
  activeMisconceptions: MisconceptionRecord[];
  flashcardSets: FlashcardSetSummary[];
  weakestConcepts: ConceptMasteryRecord[];
  weakestDrillTarget: ConceptDrillTarget | null;
}

async function loadWorkspaceOverview(
  subject?: string | null,
  signal?: AbortSignal
) {
  const url = new URL("/api/workspace/overview", window.location.origin);
  if (subject?.trim()) {
    url.searchParams.set("subject", subject.trim());
  }

  const response = await fetch(url.toString(), {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error?.trim() || "Unable to load workspace.");
  }

  return (await response.json()) as WorkspaceOverviewPayload;
}

function WorkspaceOverviewHome(props: DashboardHomeProps) {
  const runtime = useDashboardHome(props);

  return (
    <DashboardHomeSurface
      currentUserId={props.currentUserId}
      runtime={runtime}
      weakestDrillTarget={props.weakestDrillTarget}
      workspaceId={props.workspaceId}
    />
  );
}

export function WorkspaceOverviewPageClient() {
  const searchParams = usePaneSearchParams();
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

  if (status === "error") {
    return (
      <WorkspaceRoutePlaceholder
        label="Unable to load workspace."
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
    return <WorkspaceRoutePlaceholder />;
  }

  if (overviewQuery.isError) {
    return (
      <WorkspaceRoutePlaceholder
        label={
          overviewQuery.error instanceof Error
            ? overviewQuery.error.message
            : "Unable to load workspace."
        }
        pending={false}
      />
    );
  }

  if (overviewQuery.isPending || !overviewQuery.data) {
    return <WorkspaceRoutePlaceholder label="Loading workspace..." />;
  }

  return (
    <WorkspaceOverviewHome
      activeMisconceptions={overviewQuery.data.activeMisconceptions}
      currentUserId={user.id}
      flashcardSets={overviewQuery.data.flashcardSets}
      rootFolderId={workspace.rootFolderId}
      userName={user.name ?? undefined}
      weakestConcepts={overviewQuery.data.weakestConcepts}
      weakestDrillTarget={overviewQuery.data.weakestDrillTarget}
      workspaceId={workspace.workspaceId}
    />
  );
}
