"use client";

import { Button } from "@avenire/ui/components/button";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  HeaderActions,
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
  HeaderTitle,
} from "@/components/dashboard/header-portal";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { FlashcardsDashboardCreateDialog } from "@/components/flashcards/flashcards-dashboard-create-dialog";
import { FlashcardsDashboardMisconceptionDialog } from "@/components/flashcards/flashcards-dashboard-misconception-dialog";
import type { FlashcardsDashboardProps } from "@/components/flashcards/flashcards-dashboard-model";
import { FlashcardsDashboardPanels } from "@/components/flashcards/flashcards-dashboard-panels";
import type { FlashcardsDashboardRuntime } from "@/components/flashcards/use-flashcards-dashboard";
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

export function FlashcardsDashboardSurface({
  runtime,
}: {
  runtime: FlashcardsDashboardRuntime;
}) {
  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <HeaderTitle>Mindset Sets</HeaderTitle>
        <HeaderLeadingIcon>
          <BookOpenCheck className="size-3.5" />
        </HeaderLeadingIcon>
        <HeaderActions>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              disabled={!runtime.reviewTarget}
              onClick={runtime.openReviewTarget}
              type="button"
            >
              <BookOpenCheck className="size-4" />
              Go to Mindset Set
            </Button>
            <FlashcardsDashboardCreateDialog runtime={runtime} />
          </div>
        </HeaderActions>
        <HeaderBreadcrumbs>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              Mindset Sets
            </p>
          </div>
        </HeaderBreadcrumbs>

        <AnimatePresence>
          {runtime.generationLoading ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-secondary/50 p-5"
              initial={{ opacity: 0, y: 10 }}
              key="flashcard-generation"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Generating Mindset Set
                  </p>
                  <h2 className="font-semibold text-foreground text-lg tracking-tight">
                    Building your Mindset Set from onboarding
                  </h2>
                  <p className="max-w-2xl text-muted-foreground text-sm leading-6">
                    The set is being generated now. Once it is ready, you will
                    land directly in the Mindset Set view.
                  </p>
                </div>
                <div className="rounded-full bg-secondary px-3 py-1 text-muted-foreground text-xs uppercase tracking-[0.15em]">
                  Loading
                </div>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {["Generate", "Create", "Open"].map((label, index) => (
                  <div
                    className="rounded-md bg-secondary/40 px-3 py-3"
                    key={label}
                  >
                    <motion.div
                      animate={{ opacity: [0.45, 1, 0.45] }}
                      className="h-2 w-16 rounded-full bg-foreground/40"
                      transition={{
                        delay: index * 0.12,
                        duration: 1.1,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    <p className="mt-3 font-medium text-foreground text-sm">
                      {label}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {runtime.generationError ? (
          <div className="rounded-2xl border border-border/70 bg-background p-4 text-muted-foreground text-sm">
            {runtime.generationError}
          </div>
        ) : null}

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <FlashcardsDashboardPanels runtime={runtime} />
        </motion.div>
        <FlashcardsDashboardMisconceptionDialog
          misconception={runtime.selectedMisconception}
          onAdjustConfidence={(misconception, delta) => {
            void runtime.adjustMisconceptionConfidence(misconception, delta);
          }}
          onClear={(misconception) => {
            void runtime.clearMisconception(misconception);
          }}
          onClose={() => runtime.setSelectedMisconception(null)}
          onOpenFlashcards={runtime.openMisconceptionFlashcards}
          onOpenTutor={runtime.openMisconceptionTutor}
        />
      </div>
    </div>
  );
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
