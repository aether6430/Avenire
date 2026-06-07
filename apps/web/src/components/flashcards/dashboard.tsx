"use client";

import { Badge } from "@avenire/ui/components/badge";
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
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { Textarea } from "@avenire/ui/components/textarea";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpenText as BookOpenCheck,
  ChatText as MessageSquareText,
  Plus,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import type { Route } from "next";
import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import {
  HeaderActions,
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
} from "@/components/dashboard/header-portal";
import { StabilityCurves } from "@/components/flashcards/stability-curves";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import type { FlashcardDashboardRecord } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";
import {
  useCurrentWorkspacePaneCompact,
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

function getEnrollmentLabel(
  status: FlashcardDashboardRecord["sets"][number]["enrollmentStatus"]
) {
  if (status === "active") {
    return "Study active";
  }

  if (status === "paused") {
    return "Paused";
  }

  return "Not enrolled";
}

export function FlashcardsDashboard({
  generationRequest,
  initialDashboard,
}: {
  generationRequest: FlashcardGenerationRequest | null;
  initialDashboard: FlashcardDashboardRecord;
}) {
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
      orderedSets.find((candidate) => candidate.id === selectedSetId) ?? null,
    [orderedSets, selectedSetId]
  );
  const selectedSnapshots = useMemo(
    () =>
      dashboard.cardSnapshots.filter(
        (snapshot) => snapshot.card.setId === selectedSetId
      ),
    [dashboard.cardSnapshots, selectedSetId]
  );
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

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex w-full flex-col gap-3 px-4 py-4 md:gap-4 md:px-6 lg:px-8">
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

        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-4 md:gap-6 xl:grid-cols-[minmax(18rem,0.88fr)_minmax(0,1.12fr)]"
          initial={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          <div className="min-w-0">
            <h2 className="font-medium text-foreground text-sm">Decks</h2>
            <p className="mb-2 text-muted-foreground text-xs md:mb-0">
              Pick a deck and jump into review.
            </p>
            {isMobile ? (
              <div className="space-y-2">
                {orderedSets.length === 0 ? (
                  <Empty className="min-h-[10rem]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BookOpenCheck className="size-4" />
                      </EmptyMedia>
                      <EmptyTitle>No flashcard sets yet</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <EmptyDescription>
                        Create a set, or let the AI generate one from a
                        misconception or study prompt.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : (
                  orderedSets.map((set) => {
                    const isSelected = set.id === selectedSetId;
                    return (
                      <button
                        className={cn(
                          "flex w-full cursor-pointer items-start justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-secondary md:px-3 md:py-2.5",
                          isSelected && "bg-secondary/70"
                        )}
                        key={set.id}
                        onClick={() => setSelectedSetId(set.id)}
                        onFocus={() => {
                          prefetchFlashcardSet(set.id).catch(() => undefined);
                        }}
                        onMouseEnter={() => {
                          prefetchFlashcardSet(set.id).catch(() => undefined);
                        }}
                        type="button"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-foreground text-[13px] md:text-sm">
                            {set.title}
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {set.dueCount + set.newCount} ready ·{" "}
                            {set.cardCount} cards
                          </p>
                        </div>
                        {set.dueCount > 0 ? (
                          <Badge
                            className="shrink-0 rounded-md"
                            variant="outline"
                          >
                            {set.dueCount} due
                          </Badge>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>
            ) : (
              <ScrollArea className="max-h-[16rem]">
                <div className="space-y-2 p-1">
                  {orderedSets.length === 0 ? (
                    <Empty className="min-h-[10rem]">
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <BookOpenCheck className="size-4" />
                        </EmptyMedia>
                        <EmptyTitle>No flashcard sets yet</EmptyTitle>
                      </EmptyHeader>
                      <EmptyContent>
                        <EmptyDescription>
                          Create a set, or let the AI generate one from a
                          misconception or study prompt.
                        </EmptyDescription>
                      </EmptyContent>
                    </Empty>
                  ) : (
                    orderedSets.map((set) => {
                      const isSelected = set.id === selectedSetId;
                      return (
                        <button
                          className={cn(
                            "flex w-full cursor-pointer items-start justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-secondary",
                            isSelected && "bg-secondary"
                          )}
                          key={set.id}
                          onClick={() => setSelectedSetId(set.id)}
                          onFocus={() => {
                            prefetchFlashcardSet(set.id).catch(() => undefined);
                          }}
                          onMouseEnter={() => {
                            prefetchFlashcardSet(set.id).catch(() => undefined);
                          }}
                          type="button"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-foreground text-sm">
                              {set.title}
                            </p>
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {set.dueCount + set.newCount} ready ·{" "}
                              {set.cardCount} cards
                            </p>
                          </div>
                          {set.dueCount > 0 ? (
                            <Badge
                              className="shrink-0 rounded-md"
                              variant="outline"
                            >
                              {set.dueCount} due
                            </Badge>
                          ) : null}
                        </button>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="min-w-0">
            {selectedSet ? (
              <div>
                <div className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-1">
                      <h2 className="truncate font-medium text-[15px] text-foreground md:text-base">
                        {selectedSet.title}
                      </h2>
                      <p className="line-clamp-2 text-muted-foreground text-xs md:text-sm">
                        {selectedSet.description ?? "No description yet."}
                      </p>
                    </div>
                    {selectedSet.dueCount > 0 ? (
                      <Badge className="rounded-md" variant="outline">
                        {selectedSet.dueCount} due
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md bg-secondary/30 px-3 py-3 md:px-4">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                        Deck profile
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge className="rounded-md" variant="outline">
                          {selectedSet.sourceType === "ai-generated"
                            ? "AI-generated"
                            : "Manual"}
                        </Badge>
                        <Badge className="rounded-md" variant="outline">
                          {getEnrollmentLabel(selectedSet.enrollmentStatus)}
                        </Badge>
                        <Badge className="rounded-md" variant="outline">
                          {selectedSet.cardCount} cards
                        </Badge>
                      </div>
                      <p className="mt-3 text-muted-foreground text-xs">
                        {selectedSet.description ?? "No description yet."}
                      </p>
                    </div>
                    <div className="rounded-md bg-secondary/20 px-3 py-3 md:px-4">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                        Study context
                      </p>
                      <div className="mt-3 space-y-2 text-muted-foreground text-xs">
                        <p>
                          {selectedSet.lastStudiedAt
                            ? `Last studied ${new Date(
                                selectedSet.lastStudiedAt
                              ).toLocaleDateString()}`
                            : "Not studied yet"}
                        </p>
                        <p>
                          Updated{" "}
                          {new Date(selectedSet.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <StabilityCurves snapshots={selectedSnapshots} />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                        Quick cards
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {selectedSnapshots.length} tracked
                      </p>
                    </div>
                    <div className="space-y-2">
                      {selectedSnapshots.length === 0 ? (
                        <p className="text-muted-foreground text-xs">
                          No cards tracked for this deck yet.
                        </p>
                      ) : (
                        selectedSnapshots.slice(0, 3).map((snapshot) => (
                          <div
                            className="rounded-md bg-secondary/30 px-3 py-2.5 md:py-3"
                            key={snapshot.card.id}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="line-clamp-2 text-foreground text-sm">
                                  {snapshot.card.frontMarkdown}
                                </p>
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  {snapshot.dueAt
                                    ? `Due ${new Date(snapshot.dueAt).toLocaleDateString()}`
                                    : "Not scheduled"}
                                </p>
                              </div>
                              <Badge
                                className="shrink-0 rounded-md"
                                variant="outline"
                              >
                                {snapshot.displayState}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() =>
                        router.push(
                          `/workspace/flashcards/${selectedSet.id}` as Route
                        )
                      }
                      onMouseEnter={() => {
                        prefetchFlashcardSet(selectedSet.id).catch(
                          () => undefined
                        );
                      }}
                      type="button"
                    >
                      Open deck
                    </Button>
                    <Button
                      onClick={() =>
                        router.push(
                          `/workspace/flashcards/${selectedSet.id}` as Route
                        )
                      }
                      onMouseEnter={() => {
                        prefetchFlashcardSet(selectedSet.id).catch(
                          () => undefined
                        );
                      }}
                      type="button"
                      variant="outline"
                    >
                      Go
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="px-4 py-8 text-center text-muted-foreground text-xs">
                Nothing to show yet.
              </div>
            )}
          </div>
        </motion.div>

        <section className="space-y-3 border-border/50 border-t pt-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-medium text-foreground text-sm">
              Misconceptions
            </h2>
            <p className="text-muted-foreground text-xs">
              {overviewQuery.data?.activeMisconceptions.length ?? 0} active
            </p>
          </div>
          {overviewQuery.isLoading ? (
            <p className="text-muted-foreground text-xs">
              Loading misconception memory...
            </p>
          ) : overviewQuery.data?.activeMisconceptions.length ? (
            <div className="space-y-2">
              {overviewQuery.data.activeMisconceptions
                .slice(0, 6)
                .map((misconception) => (
                  <button
                    className="grid w-full cursor-pointer gap-2 rounded-md bg-secondary/25 px-3 py-2.5 text-left transition-colors hover:bg-secondary/60 md:gap-3 md:border md:border-border/60 md:bg-card md:py-3 md:grid-cols-[minmax(10rem,0.36fr)_minmax(0,1fr)]"
                    key={misconception.id}
                    onClick={() => setSelectedMisconception(misconception)}
                    type="button"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground text-sm">
                        {misconception.concept}
                      </p>
                      <p className="mt-1 truncate text-muted-foreground text-xs">
                        {misconception.subject} / {misconception.topic}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-muted-foreground text-sm leading-5">
                        {misconception.reason}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="rounded-md" variant="outline">
                          {Math.round(misconception.confidence * 100)}%
                        </Badge>
                        <Badge className="rounded-md" variant="outline">
                          {misconception.source}
                        </Badge>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          ) : (
            <p className="rounded-md border border-border/60 bg-card px-3 py-3 text-muted-foreground text-sm">
              No active misconceptions yet.
            </p>
          )}
        </section>
      </div>
      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMisconception(null);
          }
        }}
        open={selectedMisconception !== null}
      >
        <DialogContent className="h-[100dvh] w-screen max-w-none overflow-hidden rounded-none border-0 p-0 sm:h-[92vh] sm:w-[96vw] sm:max-w-[1200px] sm:rounded-xl sm:border lg:max-w-[1280px]">
          {selectedMisconception ? (
            <div className="flex h-full min-h-0 flex-col bg-background">
              <DialogHeader className="border-border/50 border-b px-5 py-5 sm:px-8 sm:py-7">
                <DialogTitle className="max-w-4xl text-balance font-semibold text-2xl leading-tight sm:text-3xl">
                  {selectedMisconception.concept}
                </DialogTitle>
                <DialogDescription className="text-sm sm:text-base">
                  {selectedMisconception.subject} /{" "}
                  {selectedMisconception.topic}
                </DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-8">
                <div className="grid w-full gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
                  <div className="max-w-4xl space-y-8">
                    <section>
                      <h3 className="font-medium text-muted-foreground text-sm">
                        Misconception summary
                      </h3>
                      <p className="mt-3 text-foreground text-xl leading-8">
                        {selectedMisconception.blocks?.summary ??
                          selectedMisconception.reason}
                      </p>
                    </section>
                    <section className="border-border/50 border-t pt-6">
                      <h3 className="font-medium text-muted-foreground text-sm">
                        Corrected mental model
                      </h3>
                      <p className="mt-3 text-foreground text-base leading-7">
                        {selectedMisconception.blocks?.correctedMentalModel ??
                          "Open this with AI to build a corrected model from the misconception evidence."}
                      </p>
                    </section>
                    <section className="border-border/50 border-t pt-6">
                      <h3 className="font-medium text-muted-foreground text-sm">
                        Short explanation
                      </h3>
                      <p className="mt-3 text-muted-foreground text-base leading-7">
                        {selectedMisconception.blocks?.explanation ??
                          selectedMisconception.reason}
                      </p>
                    </section>
                  </div>
                  <aside className="space-y-5">
                    <div className="border-border/50 border-b pb-5">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-medium text-muted-foreground text-sm">
                          Concept confidence
                        </p>
                        <p className="font-semibold text-foreground text-2xl">
                          {Math.round(selectedMisconception.confidence * 100)}%
                        </p>
                      </div>
                      <p className="mt-2 text-muted-foreground text-xs leading-5">
                        Estimate of how stable the learner's understanding is
                        for this concept.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Button
                          className="justify-center"
                          onClick={() =>
                            adjustMisconceptionConfidence(
                              selectedMisconception,
                              -0.1
                            ).catch(() => undefined)
                          }
                          type="button"
                          variant="outline"
                        >
                          Decrease
                        </Button>
                        <Button
                          className="justify-center"
                          onClick={() =>
                            adjustMisconceptionConfidence(
                              selectedMisconception,
                              0.1
                            ).catch(() => undefined)
                          }
                          type="button"
                          variant="outline"
                        >
                          Increase
                        </Button>
                      </div>
                    </div>
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        const prompt = promptForMisconception(
                          selectedMisconception
                        );
                        router.push(`/workspace/chats/new?prompt=${prompt}`);
                      }}
                      type="button"
                      variant="outline"
                    >
                      <MessageSquareText className="size-4" />
                      Method with AI
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        const prompt = promptForFlashcards(
                          selectedMisconception
                        );
                        router.push(`/workspace/chats/new?prompt=${prompt}`);
                      }}
                      type="button"
                      variant="outline"
                    >
                      <BookOpenCheck className="size-4" />
                      Generate mindset
                    </Button>
                    <Button
                      className="w-full justify-start"
                      onClick={() => {
                        clearMisconception(selectedMisconception).catch(
                          () => undefined
                        );
                      }}
                      type="button"
                      variant="destructive"
                    >
                      Clear misconception
                    </Button>
                  </aside>
                </div>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
