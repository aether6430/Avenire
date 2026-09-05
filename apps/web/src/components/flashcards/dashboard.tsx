"use client";

import { Button } from "@avenire/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@avenire/ui/components/dialog";
import {
  Drawer,
  DrawerContent,
} from "@avenire/ui/components/drawer";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { Textarea } from "@avenire/ui/components/textarea";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpenText as BookOpenCheck,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Plus,
  WarningCircle,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  HeaderActions,
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
} from "@/components/dashboard/header-portal";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import type { FlashcardDashboardRecord } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";
import { STATIC_ASSETS } from "@/lib/static-assets";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  usePanePathname,
  usePaneRouter,
  usePaneSearchParams,
} from "@/lib/workspace-panes";
import { usePaneWorkspaceHistoryActions } from "@/stores/workspaceHistoryStore";

interface FlashcardGenerationRequest {
  concept: string;
  count: number;
  reason: string;
  subject: string;
  title?: string;
  topic: string;
}

interface MindsetOverviewPayload {
  activeMisconceptions: MisconceptionRecord[];
}

async function loadMindsetOverview(signal?: AbortSignal) {
  const response = await fetch("/api/workspace/overview", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load mindset overview.");
  }

  return (await response.json()) as MindsetOverviewPayload;
}

async function generateOnboardingSet(
  generationRequest: FlashcardGenerationRequest
) {
  const response = await fetch("/api/flashcards/onboarding", {
    body: JSON.stringify(generationRequest),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error ?? "Unable to generate mindset.");
  }

  const payload = (await response.json()) as {
    set?: { id?: string };
  };
  const setId = payload.set?.id;
  if (!setId) {
    throw new Error("Mindset generation did not return a set.");
  }

  return setId;
}

function formatShortDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

function getMisconceptionSummary(misconception: MisconceptionRecord) {
  return misconception.blocks?.summary ?? misconception.reason;
}

function getCorrectedMentalModel(misconception: MisconceptionRecord) {
  return (
    misconception.blocks?.correctedMentalModel ??
    "Open this with AI to build the corrected model from the flagged evidence."
  );
}

function ExpandableText({ children }: { children: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <p
        className={cn(
          "mt-1 text-muted-foreground text-sm leading-6",
          !expanded && "line-clamp-2"
        )}
      >
        {children}
      </p>
      <button
        className="mt-1 font-medium text-foreground text-xs transition-colors hover:text-muted-foreground"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        {expanded ? "Show less" : "Read more"}
      </button>
    </div>
  );
}

function StrideFileIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 116.4 162.9"
    >
      <path
        className="fill-muted-foreground/70"
        d="m9.5 23.8v115.2c0.1 7.4 6.2 15 15.5 15h68c4.3 0 8.1 0.3 11.6-1.3 0.2-1.6 3-7.6 3-13.7v-92.2c0-4.9-2.7-11.5-7-14.8l-22.6-18.9c-3-2.4-7.6-4.3-12.6-4.3h-40.4c-8.3 0-15.5 6-15.5 15z"
      />
      <path
        className="fill-muted-foreground/75"
        d="m9.5 24v115.7c0 7.6 6.5 14.3 15.6 14.3h68c8.5 0 14.4-6.5 14.4-15l-0.1-92.6c0.2-4.9-2.5-11.1-6.8-14.4l-22.6-18.9c-3-2.4-7.6-4.3-12.6-4.3h-40.4c-8.3 0-15.5 6.2-15.5 15.2z"
      />
      <path
        className="fill-muted-foreground/55"
        d="m66.5 8.8c10.6 0.7 17.4 8.6 17.4 18.5 0 3-0.6 8.8 3.1 8.2 2.3-0.2 3.4-1.4 6.8-1.4 8.4-0.1 13.7 5.2 13.8 12.2-0.3-6.3-2.5-12.3-6.3-15l-22.6-17.8c-3.5-2.8-8.1-4.5-12.2-4.7z"
      />
      <path
        className="fill-background/50"
        d="m57.5 44.6h-34.7c-2.2 0-4.2-1.6-4.2-4 0-2.1 1.8-4.1 4.2-4.1h34.7c2.2 0 3.9 1.8 3.9 4.1s-1.8 4-3.9 4z"
      />
      <path
        className="fill-background/50"
        d="m93.6 81.8h-70.9c-2.2 0.3-4.1-1.5-4.1-3.9 0-2.2 2-4.3 4.2-4.3h70.8c2.5 0 4.4 1.6 4.4 4.1 0 2.2-1.9 4.1-4.4 4.1z"
      />
      <path
        className="fill-background/50"
        d="m93.5 102.5h-70.8c-2.2 0.2-4.1-1.6-4.1-4 0-2.1 2-4.2 4.2-4.2h70.7c2.4 0 4.5 1.7 4.5 4.2 0 2.2-2.1 4-4.5 4z"
      />
      <path
        className="fill-background/50"
        d="m93.6 69.7h-70.8c-2.2 0.2-4.2-1.6-4.2-4.1 0-2.1 1.8-4.5 4.2-4.5h70.8c2.3 0 4.4 1.8 4.4 4.4 0 2.2-2.1 4.2-4.4 4.2z"
      />
      <path
        className="fill-background/50"
        d="m93.5 57h-70.8c-2.2 0.3-4.1-1.5-4.1-4.1 0-2.2 2-4.9 4.2-4.9h70.7c2.4 0 4.5 2.4 4.5 4.3 0 2.6-2.1 4.7-4.5 4.7z"
      />
      <path
        className="fill-background/50"
        d="m93.5 115.4h-70.8c-2.2 0.2-4.1-1.5-4.1-4.1 0-2.3 1.8-5 4.2-5h70.7c2.4 0 4.5 1.8 4.5 4.5 0 2.2-2.1 4.6-4.5 4.6z"
      />
      <path
        className="fill-background/50"
        d="m93.5 127.6h-70.8c-2.2 0.3-4.1-1.5-4.1-4 0-2.1 1.8-4.3 4.1-4.3h70.8c2.4 0 4.5 1.7 4.5 4.3 0 2.3-2.1 4-4.5 4z"
      />
    </svg>
  );
}

export function FlashcardsDashboard({
  generationRequest,
  initialDashboard,
}: {
  generationRequest: FlashcardGenerationRequest | null;
  initialDashboard: FlashcardDashboardRecord;
}) {
  const router = usePaneRouter();
  const isMobile = useIsMobile();
  const pathname = usePanePathname();
  const searchParams = usePaneSearchParams();
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
    () =>
      dashboard.sets.slice().sort((left, right) => {
        const pressureDiff =
          right.dueCount + right.newCount - (left.dueCount + left.newCount);

        if (pressureDiff !== 0) {
          return pressureDiff;
        }

        return (
          new Date(right.updatedAt).getTime() -
          new Date(left.updatedAt).getTime()
        );
      }),
    [dashboard.sets]
  );
  const reviewTarget = useMemo(
    () =>
      orderedSets.find((set) => set.dueCount > 0 || set.newCount > 0) ?? null,
    [orderedSets]
  );
  const activeMisconceptions = overviewQuery.data?.activeMisconceptions ?? [];
  const dashboardTotals = useMemo(
    () => ({
      cards: orderedSets.reduce((total, set) => total + set.cardCount, 0),
      due: orderedSets.reduce(
        (total, set) => total + set.dueCount + set.newCount,
        0
      ),
      reviewsToday: orderedSets.reduce(
        (total, set) => total + set.reviewCountToday,
        0
      ),
    }),
    [orderedSets]
  );
  const weeklyPlanSets = useMemo(() => orderedSets.slice(0, 4), [orderedSets]);
  const knowledgeGaps = useMemo(
    () =>
      activeMisconceptions
        .slice()
        .sort((left, right) => right.confidence - left.confidence)
        .slice(0, 3),
    [activeMisconceptions]
  );
  const selectedMisconceptionIndex = selectedMisconception
    ? activeMisconceptions.findIndex(
        (misconception) => misconception.id === selectedMisconception.id
      )
    : -1;
  const reviewedSnapshots = dashboard.cardSnapshots.filter((snapshot) =>
    ["learning", "young", "mature", "relearning"].includes(
      snapshot.displayState
    )
  );
  const retainedSnapshots = reviewedSnapshots.filter((snapshot) =>
    ["young", "mature"].includes(snapshot.displayState)
  );
  const masteredConcepts = retainedSnapshots.length;
  const currentlyLearning =
    dashboardTotals.due +
    dashboard.cardSnapshots.filter((snapshot) =>
      ["learning", "relearning", "new"].includes(snapshot.displayState)
    ).length;
  const retentionPercent =
    reviewedSnapshots.length > 0
      ? Math.round((retainedSnapshots.length / reviewedSnapshots.length) * 100)
      : 0;
  const masteredPercent =
    reviewedSnapshots.length > 0
      ? Math.round((masteredConcepts / reviewedSnapshots.length) * 100)
      : 0;
  const learningPercent =
    dashboardTotals.cards > 0
      ? Math.round((currentlyLearning / dashboardTotals.cards) * 100)
      : 0;
  const gapPressurePercent =
    activeMisconceptions.length > 0
      ? Math.min(100, Math.max(12, activeMisconceptions.length * 10))
      : 0;
  const headerLeadingIcon = useMemo(
    () => <BookOpenCheck className="size-3.5" />,
    []
  );
  const headerBreadcrumbs = useMemo(
    () => (
      <div className="min-w-0">
        <p className="truncate font-medium text-foreground text-sm">Mindset</p>
      </div>
    ),
    []
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
    const misconceptionId = searchParams.get("misconception");
    if (!(misconceptionId && overviewQuery.data?.activeMisconceptions.length)) {
      return;
    }

    const target = overviewQuery.data.activeMisconceptions.find(
      (misconception) => misconception.id === misconceptionId
    );
    if (target) {
      setSelectedMisconception(target);
    }
  }, [overviewQuery.data?.activeMisconceptions, searchParams]);

  useEffect(() => {
    if (!generationRequest || generationStartedRef.current) {
      return;
    }
    generationStartedRef.current = true;
    setGenerationLoading(true);
    setGenerationError(null);

    const runGeneration = async () => {
      try {
        const setId = await generateOnboardingSet(generationRequest);
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
      const response = await fetch("/api/flashcards/sets", {
        body: JSON.stringify({
          description,
          tags: tags
            .split(",")
            .map((entry) => entry.trim())
            .filter(Boolean),
          title,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        setCreateStatus("Could not create the set.");
        return;
      }

      const payload = (await response.json()) as {
        set?: { id?: string };
      };
      const setId = payload.set?.id;
      if (!setId) {
        setCreateStatus(
          "The set was created, but no route target was returned."
        );
        return;
      }

      setCreateOpen(false);
      setTitle("");
      setDescription("");
      setTags("");
      setCreateStatus(null);
      startTransition(() => {
        router.push(`/workspace/flashcards/${setId}` as Route);
      });
    } finally {
      setBusy(false);
    }
  };

  const promptForMisconception = (misconception: MisconceptionRecord) =>
    encodeURIComponent(
      `Help me fix this misconception.\n\nConcept: ${misconception.concept}\nSubject: ${misconception.subject}\nTopic: ${misconception.topic}\nReason: ${misconception.reason}\n\nFirst check the current misconception context, then teach the correct model, and test me with a few questions.`
    );

  const promptForFlashcards = (misconception: MisconceptionRecord) =>
    encodeURIComponent(
      `Generate a flashcard set from this misconception and focus on correcting the wrong model.\n\nConcept: ${misconception.concept}\nSubject: ${misconception.subject}\nTopic: ${misconception.topic}\nReason: ${misconception.reason}\n\nUse the misconception tools if needed, then create the flashcard set from the wrong model and the corrected model.`
    );

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

    if (response.ok) {
      await overviewQuery.refetch();
      router.refresh();
      setSelectedMisconception({
        ...misconception,
        confidence: Math.min(1, Math.max(0, misconception.confidence + delta)),
      });
    }
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

    if (response.ok) {
      setSelectedMisconception(null);
      await overviewQuery.refetch();
      router.refresh();
    }
  };

  const [resolvingMisconception, setResolvingMisconception] = useState(false);

  const resolveMisconception = async (misconception: MisconceptionRecord) => {
    setResolvingMisconception(true);
    try {
      const response = await fetch("/api/misconceptions/resolve", {
        body: JSON.stringify({
          concept: misconception.concept,
          subject: misconception.subject,
          topic: misconception.topic,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        toast.error("Unable to mark this misconception as resolved. Try again.");
        return;
      }

      setSelectedMisconception(null);
      await overviewQuery.refetch();
      router.refresh();
    } catch {
      toast.error("Unable to mark this misconception as resolved. Try again.");
    } finally {
      setResolvingMisconception(false);
    }
  };

  const showAdjacentMisconception = (direction: -1 | 1) => {
    if (activeMisconceptions.length === 0) {
      return;
    }

    const currentIndex =
      selectedMisconceptionIndex >= 0 ? selectedMisconceptionIndex : 0;
    const nextIndex =
      (currentIndex + direction + activeMisconceptions.length) %
      activeMisconceptions.length;
    setSelectedMisconception(activeMisconceptions[nextIndex] ?? null);
  };

  const closeSelectedMisconception = () => {
    setSelectedMisconception(null);
    if (searchParams.get("misconception")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("misconception");
      const query = params.toString();
      router.replace((query ? `${pathname}?${query}` : pathname) as Route);
    }
  };

  const renderMisconceptionPanel = () => {
    if (!selectedMisconception) {
      return null;
    }

    return (
      <>
        <div className="relative h-40 w-full shrink-0 overflow-hidden sm:h-48">
          {activeMisconceptions.length > 1 ? (
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
              <Button
                aria-label="Previous knowledge gap"
                className="h-7 w-7 rounded-md bg-background/80 p-0 text-foreground hover:bg-background"
                onClick={() => showAdjacentMisconception(-1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <CaretLeft className="size-4" />
              </Button>
              <Button
                aria-label="Next knowledge gap"
                className="h-7 w-7 rounded-md bg-background/80 p-0 text-foreground hover:bg-background"
                onClick={() => showAdjacentMisconception(1)}
                size="icon"
                type="button"
                variant="ghost"
              >
                <CaretRight className="size-4" />
              </Button>
            </div>
          ) : null}
          <img
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            src={STATIC_ASSETS.banner1}
          />
        </div>

        <div className="min-h-0 flex-1">
          <div className="space-y-7 px-6 py-7 sm:px-8">
            <div>
              <h2 className="text-balance font-semibold text-3xl text-foreground leading-tight">
                {selectedMisconception.concept}
              </h2>
              <p className="mt-2 text-muted-foreground text-sm">
                {selectedMisconception.subject} / {selectedMisconception.topic}
              </p>
              <p className="mt-5 max-w-2xl text-foreground/80 text-sm leading-6">
                {getMisconceptionSummary(selectedMisconception)}
              </p>
            </div>

            <section>
              <h3 className="font-semibold text-foreground text-base">
                What was identified
              </h3>
              <div className="mt-4 space-y-4">
                <div className="flex gap-4">
                  <WarningCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Why this was flagged
                    </p>
                    <ExpandableText>
                      {selectedMisconception.reason}
                    </ExpandableText>
                  </div>
                </div>
                <div className="flex gap-4">
                  <BookOpenCheck className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Correct mental model
                    </p>
                    <ExpandableText>
                      {getCorrectedMentalModel(selectedMisconception)}
                    </ExpandableText>
                  </div>
                </div>
                <div className="flex gap-4">
                  <WarningCircle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      Supporting evidence
                    </p>
                    <p className="mt-1 text-muted-foreground text-sm leading-6">
                      {Math.round(selectedMisconception.confidence * 100)}%
                      confidence · {selectedMisconception.evidenceCount}{" "}
                      evidence item
                      {selectedMisconception.evidenceCount === 1 ? "" : "s"}
                      {" · "}
                      {formatShortDate(selectedMisconception.lastSeenAt) ??
                        "recently seen"}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-border/60 border-t px-6 py-4 sm:flex-row sm:px-8">
          <Button
            className="h-9 flex-1 justify-center"
            onClick={() => {
              const prompt = promptForMisconception(selectedMisconception);
              router.push(`/workspace/chats/new?prompt=${prompt}`);
            }}
            type="button"
          >
            Fix With AI
          </Button>
          <Button
            className="h-9 flex-1 justify-center"
            onClick={() => {
              const prompt = promptForFlashcards(selectedMisconception);
              router.push(`/workspace/chats/new?prompt=${prompt}`);
            }}
            type="button"
            variant="outline"
          >
            Review Related Cards
          </Button>
          <Button
            className="h-9 flex-1 justify-center"
            disabled={resolvingMisconception}
            onClick={() => {
              void resolveMisconception(selectedMisconception);
            }}
            type="button"
            variant="outline"
          >
            {resolvingMisconception ? (
              <Spinner className="size-4" />
            ) : (
              <CheckCircle className="size-4" />
            )}
            Mark as resolved
          </Button>
        </div>
      </>
    );
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-8 lg:px-10">
        <HeaderLeadingIcon>{headerLeadingIcon}</HeaderLeadingIcon>
        <HeaderActions>
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            <Button
              className="h-8 rounded-full px-3 text-xs md:h-9 md:rounded-md md:text-sm"
              disabled={!reviewTarget}
              onClick={() => {
                if (!reviewTarget) {
                  return;
                }
                router.push(
                  `/workspace/flashcards/${reviewTarget.id}` as Route
                );
              }}
              type="button"
            >
              <BookOpenCheck className="size-4" />
              Go to deck
            </Button>
            <Dialog onOpenChange={setCreateOpen} open={createOpen}>
              <DialogTrigger
                render={
                  <Button
                    className="h-8 rounded-full px-3 text-xs md:h-9 md:rounded-md md:text-sm"
                    variant="outline"
                  />
                }
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">New Set</span>
              </DialogTrigger>
              <DialogContent className="max-w-xl">
                <DialogHeader>
                  <DialogTitle>Create set</DialogTitle>
                  <DialogDescription>
                    Shared sets stay at workspace scope. Review history stays
                    personal.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="flashcards-set-title">Title</Label>
                    <Input
                      id="flashcards-set-title"
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="Control systems"
                      value={title}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="flashcards-set-description">
                      Description
                    </Label>
                    <Textarea
                      id="flashcards-set-description"
                      onChange={(event) => setDescription(event.target.value)}
                      placeholder="Feedback, stability, and state-space revision"
                      value={description}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="flashcards-set-tags">Tags</Label>
                    <Input
                      id="flashcards-set-tags"
                      onChange={(event) => setTags(event.target.value)}
                      placeholder="signals, controls, exam-2"
                      value={tags}
                    />
                  </div>
                </div>
                {createStatus ? (
                  <p className="text-muted-foreground text-xs">
                    {createStatus}
                  </p>
                ) : null}
                <DialogFooter>
                  <Button
                    disabled={busy || !title.trim()}
                    onClick={createSet}
                    type="button"
                  >
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </HeaderActions>
        <HeaderBreadcrumbs>{headerBreadcrumbs}</HeaderBreadcrumbs>

        <AnimatePresence>
          {generationLoading ? (
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              className="rounded-md bg-secondary/50 p-5"
              initial={{ opacity: 0, y: 10 }}
              key="flashcard-generation"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs uppercase tracking-[0.18em]">
                    Generating mindset
                  </p>
                  <h2 className="font-semibold text-foreground text-lg tracking-tight">
                    Building your deck from onboarding
                  </h2>
                  <p className="max-w-2xl text-muted-foreground text-sm leading-6">
                    The set is being generated now. Once it is ready, you will
                    land directly in the mindset view.
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
                        duration: 1.1,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: index * 0.12,
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
        {generationError ? (
          <div className="rounded-2xl border border-border/70 bg-background p-4 text-muted-foreground text-sm">
            {generationError}
          </div>
        ) : null}

        <section className="border-border/60 border-b pb-10 pt-6">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div className="min-w-0">
              <h1 className="text-balance font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
                Ready to review
              </h1>
              <div className="mt-7 flex flex-wrap gap-12">
                <div>
                  <p className="text-muted-foreground text-sm">Cards due</p>
                  <p className="mt-1 font-semibold text-4xl text-foreground tabular-nums">
                    {dashboardTotals.due}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">
                    Knowledge gaps
                  </p>
                  <p className="mt-1 font-semibold text-4xl text-foreground tabular-nums">
                    {activeMisconceptions.length}
                  </p>
                </div>
              </div>
            </div>
            <Button
              className="h-9 justify-center rounded-md px-4"
              disabled={!reviewTarget}
              onClick={() => {
                if (!reviewTarget) {
                  return;
                }
                router.push(
                  `/workspace/flashcards/${reviewTarget.id}?study=1` as Route
                );
              }}
              type="button"
            >
              <BookOpenCheck className="size-4" />
              Start review
            </Button>
          </div>
        </section>

        <section className="space-y-6 border-border/60 border-b pb-10">
          <h2 className="font-semibold text-foreground text-lg">
            Performance overview
          </h2>
          <div className="grid gap-9 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                color: "bg-emerald-500",
                detail: "estimated retained",
                label: "Retention",
                progress: retentionPercent,
                value: `${retentionPercent}%`,
              },
              {
                color: "bg-primary",
                detail: "stable cards",
                label: "Mastered concepts",
                progress: masteredPercent,
                value: masteredConcepts,
              },
              {
                color: "bg-sky-500",
                detail: "in active practice",
                label: "Currently learning",
                progress: learningPercent,
                value: currentlyLearning,
              },
              {
                color: "bg-destructive",
                detail: "need reinforcement",
                label: "Knowledge gaps",
                progress: gapPressurePercent,
                value: activeMisconceptions.length,
              },
            ].map((metric) => (
              <div className="flex min-h-20 gap-4" key={metric.label}>
                <div className="mt-1 flex h-16 w-1.5 shrink-0 flex-col justify-end overflow-hidden rounded-full bg-secondary">
                  <div
                    className={cn("min-h-1 rounded-full", metric.color)}
                    style={{ height: `${metric.progress}%` }}
                  />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">
                    {metric.label}
                  </p>
                  <p className="mt-2 font-semibold text-3xl text-foreground tabular-nums">
                    {metric.value}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {metric.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section
          className="space-y-6 border-border/60 border-b pb-10"
          id="continue-learning"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-foreground text-lg">
              Continue learning
            </h2>
            <p className="text-muted-foreground text-sm">
              {weeklyPlanSets.length} deck
              {weeklyPlanSets.length === 1 ? "" : "s"}
            </p>
          </div>
          {weeklyPlanSets.length === 0 ? (
            <Empty className="min-h-[12rem]">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BookOpenCheck className="size-4" />
                </EmptyMedia>
                <EmptyTitle>No decks yet</EmptyTitle>
              </EmptyHeader>
              <EmptyContent>
                <EmptyDescription>
                  Create a deck or generate one from a knowledge gap to start
                  reviewing.
                </EmptyDescription>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-4">
              {weeklyPlanSets.map((set) => (
                <button
                  className="group flex min-h-56 flex-col items-center justify-center px-5 py-6 text-center transition-colors hover:bg-secondary/60"
                  key={set.id}
                  onClick={() =>
                    router.push(`/workspace/flashcards/${set.id}` as Route)
                  }
                  onFocus={() => {
                    prefetchFlashcardSet(set.id).catch(() => undefined);
                  }}
                  onMouseEnter={() => {
                    prefetchFlashcardSet(set.id).catch(() => undefined);
                  }}
                  type="button"
                >
                  <StrideFileIcon className="size-20 text-muted-foreground transition-colors group-hover:text-foreground" />
                  <div className="mt-6 min-w-0">
                    <h3 className="font-medium text-foreground text-base leading-6">
                      {set.title}
                    </h3>
                    <p className="mt-2 text-muted-foreground text-sm">
                      {set.dueCount + set.newCount} cards due
                    </p>
                  </div>
                  <span className="mt-6 text-muted-foreground text-xs transition-colors group-hover:text-foreground">
                    Continue
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-5 pb-8" id="knowledge-gaps">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-foreground text-lg">
              Knowledge gaps
            </h2>
            {activeMisconceptions.length > knowledgeGaps.length ? (
              <button
                className="text-muted-foreground text-sm transition-colors hover:text-foreground"
                onClick={() => {
                  setSelectedMisconception(activeMisconceptions[0] ?? null);
                }}
                type="button"
              >
                View all
              </button>
            ) : null}
          </div>
          {overviewQuery.isLoading ? (
            <p className="text-muted-foreground text-sm">
              Loading knowledge gaps...
            </p>
          ) : knowledgeGaps.length === 0 ? (
            <p className="py-5 text-muted-foreground text-sm">
              No active knowledge gaps right now.
            </p>
          ) : (
            <div className="divide-y divide-border/60">
              {knowledgeGaps.map((misconception) => (
                <button
                  className="flex w-full items-start gap-5 py-5 text-left transition-colors hover:bg-secondary/40"
                  key={misconception.id}
                  onClick={() => setSelectedMisconception(misconception)}
                  type="button"
                >
                  <WarningCircle className="mt-1 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="font-medium text-foreground text-base">
                        {misconception.concept}
                      </h3>
                      <p className="shrink-0 text-muted-foreground text-sm tabular-nums">
                        {Math.round(misconception.confidence * 100)}%
                      </p>
                    </div>
                    <p className="mt-2 text-muted-foreground text-sm leading-6">
                      {getMisconceptionSummary(misconception)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      {isMobile ? (
        <Drawer
          direction="bottom"
          onOpenChange={(open) => {
            if (!open) {
              closeSelectedMisconception();
            }
          }}
          open={selectedMisconception !== null}
        >
          <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[86dvh]">
            <div className="flex h-full max-h-[inherit] min-h-0 flex-col overflow-y-auto">
              {renderMisconceptionPanel()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog
          onOpenChange={(open) => {
            if (!open) {
              closeSelectedMisconception();
            }
          }}
          open={selectedMisconception !== null}
        >
          <DialogContent className="flex max-h-[88dvh] w-[min(calc(100vw-2rem),58rem)] max-w-none flex-col gap-0 overflow-hidden rounded-lg border border-border/60 p-0 shadow-surface-8">
            {renderMisconceptionPanel()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
