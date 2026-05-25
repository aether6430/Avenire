"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
  HeaderTitle,
} from "@/components/dashboard/header-portal";
import { FlashcardSetDetailActions } from "@/components/flashcards/flashcard-set-detail-actions";
import { FlashcardSetDetailCardBank } from "@/components/flashcards/flashcard-set-detail-card-bank";
import type { FlashcardSetDetailRuntime } from "@/components/flashcards/use-flashcard-set-detail";
import { useFlashcardSetDetail } from "@/components/flashcards/use-flashcard-set-detail";
import { useDeferredPresence } from "@/hooks/use-deferred-presence";
import {
  readCachedFlashcardSet,
  removeCachedFlashcardSet,
  writeCachedFlashcardSet,
} from "@/lib/flashcard-browser-cache";
import { normalizeFlashcardSetId } from "@/lib/flashcard-set-id";
import type { FlashcardSetRecord, FlashcardTaxonomy } from "@/lib/flashcards";

const FlashcardSetDetailStudyRuntime = dynamic(
  () =>
    import("@/components/flashcards/flashcard-set-detail-study-runtime").then(
      (module) => module.FlashcardSetDetailStudyRuntime
    ),
  { ssr: false }
);

export function FlashcardSetDetailSurface({
  runtime,
}: {
  runtime: FlashcardSetDetailRuntime;
}) {
  const {
    archiveCard,
    backMarkdown,
    busy,
    concept,
    deleteSet,
    drillFilters,
    editorOpen,
    editingCard,
    filteredCards,
    frontMarkdown,
    notesMarkdown,
    openEditor,
    reviewSummary,
    saveCard,
    saveSet,
    search,
    set,
    setBackMarkdown,
    setConcept,
    setDescription,
    setDescriptionValue,
    setEditorOpen,
    setEnrollmentLabel,
    setFrontMarkdown,
    setMetadataEditorOpen,
    setMetadataEditorOpenValue,
    setNotesMarkdown,
    setSearch,
    setSubject,
    setTags,
    setTitle,
    setTitleValue,
    setTopic,
    snapshotByCardId,
    startReview,
    studyOpen,
    studyRefreshToken,
    subject,
    tags,
    toggleEnrollment,
    topic,
    handleStudyOpenChange,
    initialQueue,
    loadSet,
  } = runtime;

  const headerLeadingIcon = <BookOpenCheck className="size-3.5" />;
  const headerBreadcrumbs = (
    <div className="min-w-0">
      <p className="truncate text-muted-foreground text-sm">Mindset Set</p>
      <p className="truncate text-muted-foreground text-xs">{set.title}</p>
    </div>
  );
  const renderStudyRuntime = useDeferredPresence(studyOpen);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <HeaderTitle>{set.title}</HeaderTitle>
        <HeaderLeadingIcon>{headerLeadingIcon}</HeaderLeadingIcon>
        <HeaderBreadcrumbs>{headerBreadcrumbs}</HeaderBreadcrumbs>
        <div>
          <div>
            <div className="gap-3 border-border/40 border-b pb-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-md" variant="outline">
                      {set.sourceType === "ai-generated"
                        ? "AI-generated"
                        : "Manual"}
                    </Badge>
                    <Badge className="rounded-md" variant="outline">
                      {set.stateCounts.killed} killed
                    </Badge>
                  </div>
                  <div>
                    <h1 className="font-semibold text-xl tracking-tight">
                      {set.title}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                      {set.description ??
                        "No description set for this Mindset Set."}
                    </p>
                  </div>
                  {drillFilters.length > 0 ? (
                    <div className="rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-xs dark:border-amber-400/20 dark:bg-amber-500/10">
                      <p className="font-medium text-amber-900 dark:text-amber-100">
                        Drill session
                      </p>
                      <p className="mt-1 text-amber-700 dark:text-amber-200">
                        Review is limited to canonical matches for these
                        concepts.
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {drillFilters.map((filter) => (
                          <Badge
                            className="rounded-full border-amber-300/80 bg-background/80 text-[11px] text-amber-900 dark:border-amber-400/20 dark:bg-background/20 dark:text-amber-100"
                            key={`${filter.subject}:${filter.topic}:${filter.concept}`}
                            variant="outline"
                          >
                            {filter.concept}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <FlashcardSetDetailActions
                  backMarkdown={backMarkdown}
                  busy={busy}
                  concept={concept}
                  description={setDescriptionValue}
                  editingCard={editingCard}
                  editorOpen={editorOpen}
                  enrollmentStatus={set.enrollment?.status}
                  frontMarkdown={frontMarkdown}
                  notesMarkdown={notesMarkdown}
                  onArchiveSet={deleteSet}
                  onBackMarkdownChange={setBackMarkdown}
                  onCardEditorOpenChange={setEditorOpen}
                  onConceptChange={setConcept}
                  onDescriptionChange={setDescription}
                  onFrontMarkdownChange={setFrontMarkdown}
                  onNotesMarkdownChange={setNotesMarkdown}
                  onOpenEditor={openEditor}
                  onSaveCard={saveCard}
                  onSaveSet={saveSet}
                  onSetMetadataOpenChange={setMetadataEditorOpen}
                  onSubjectChange={setSubject}
                  onTagsChange={setTags}
                  onTitleChange={setTitle}
                  onToggleEnrollment={toggleEnrollment}
                  onTopicChange={setTopic}
                  setMetadataEditorOpen={setMetadataEditorOpenValue}
                  subject={subject}
                  tags={tags}
                  title={setTitleValue}
                  topic={topic}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="font-medium text-foreground text-sm">Review</p>
              <p className="text-muted-foreground text-xs">{reviewSummary}</p>
            </div>
            <Button
              disabled={set.dueCount + set.newCount <= 0}
              onClick={startReview}
              type="button"
              variant="outline"
            >
              {set.dueCount + set.newCount > 0
                ? "Start review"
                : "No cards queued"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 border-border/50 border-y py-3">
            <Badge className="rounded-md" variant="outline">
              {set.sourceType === "ai-generated" ? "AI-generated" : "Manual"}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {setEnrollmentLabel}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {set.cardCount} cards
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {set.stateCounts.killed} killed
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {set.stateCounts.learning + set.stateCounts.relearning} in
              progress
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {set.reviewCountToday} studied today
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {set.reviewCount7d} reviews in 7d
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {set.lastStudiedAt
                ? `Last ${new Date(set.lastStudiedAt).toLocaleDateString()}`
                : "Not studied yet"}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              Updated {new Date(set.updatedAt).toLocaleDateString()}
            </Badge>
          </div>

          {renderStudyRuntime ? (
            <FlashcardSetDetailStudyRuntime
              drillFilters={drillFilters}
              initialQueue={initialQueue}
              onOpenChange={handleStudyOpenChange}
              onRefreshSet={loadSet}
              open={studyOpen}
              refreshToken={studyRefreshToken}
              setId={set.id}
              setTitle={set.title}
            />
          ) : null}

          <FlashcardSetDetailCardBank
            filteredCards={filteredCards}
            onArchiveCard={(cardId) => {
              void archiveCard(cardId);
            }}
            onEditCard={openEditor}
            onSearchChange={setSearch}
            search={search}
            snapshotByCardId={snapshotByCardId}
          />
        </div>
      </div>
    </div>
  );
}

function ReadyFlashcardSetDetail({
  initialDrillFilters,
  initialSet,
  initialStudyOpen = false,
}: {
  initialDrillFilters: FlashcardTaxonomy[];
  initialSet: FlashcardSetRecord;
  initialStudyOpen?: boolean;
}) {
  const runtime = useFlashcardSetDetail({
    initialDrillFilters,
    initialSet,
    initialStudyOpen,
  });

  return <FlashcardSetDetailSurface runtime={runtime} />;
}

function hasMatchingVersion(
  current: FlashcardSetRecord | null,
  next: FlashcardSetRecord
) {
  return current?.id === next.id && current.updatedAt === next.updatedAt;
}

function readMindsetError(status: number) {
  return status === 404
    ? "Mindset Set not found."
    : "Unable to load Mindset Set.";
}

function parseDrillFilters(rawDrill: string | string[] | undefined) {
  const values: string[] = [];

  if (Array.isArray(rawDrill)) {
    values.push(...rawDrill);
  } else if (rawDrill) {
    values.push(rawDrill);
  }

  return values.flatMap((value) => {
    try {
      const parsed = JSON.parse(value) as Partial<FlashcardTaxonomy>;
      if (
        typeof parsed.subject !== "string" ||
        typeof parsed.topic !== "string" ||
        typeof parsed.concept !== "string"
      ) {
        return [];
      }

      return [
        {
          concept: parsed.concept,
          subject: parsed.subject,
          topic: parsed.topic,
        },
      ];
    } catch {
      return [];
    }
  });
}

function DetailPageBreadcrumbs({ title }: { title: string }) {
  return (
    <HeaderBreadcrumbs>
      <div className="min-w-0">
        <p className="truncate text-muted-foreground text-sm">Mindset Set</p>
        <p className="truncate text-muted-foreground text-xs">{title}</p>
      </div>
    </HeaderBreadcrumbs>
  );
}

function LoadingShell() {
  return (
    <div className="flex h-full items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
          Loading Mindset Set
        </p>
        <h1 className="mt-2 font-semibold text-2xl tracking-tight">
          Opening Mindset Set
        </h1>
        <div className="mt-6 space-y-3">
          <div className="h-5 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="h-32 animate-pulse rounded-2xl bg-muted/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
            <div className="h-24 animate-pulse rounded-2xl bg-muted/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function FlashcardSetPageClient({
  autoStudy,
  drillFilters: rawDrillFilters,
  setId,
}: {
  autoStudy: boolean;
  drillFilters: string | string[] | undefined;
  setId: string;
}) {
  const initialDrillFilters = useMemo(
    () => parseDrillFilters(rawDrillFilters),
    [rawDrillFilters]
  );
  const normalizedSetId = useMemo(
    () => normalizeFlashcardSetId(setId),
    [setId]
  );
  const cachedSet = useMemo(
    () => (normalizedSetId ? readCachedFlashcardSet(normalizedSetId) : null),
    [normalizedSetId]
  );
  const [set, setSet] = useState<FlashcardSetRecord | null>(cachedSet);
  const [loading, setLoading] = useState(
    () => cachedSet === null && normalizedSetId !== null
  );
  const [error, setError] = useState<string | null>(() =>
    normalizedSetId ? null : "Mindset Set not found."
  );
  const loadedSetIdRef = useRef(cachedSet?.id ?? null);

  const applySet = useCallback((nextSet: FlashcardSetRecord) => {
    loadedSetIdRef.current = nextSet.id;
    writeCachedFlashcardSet(nextSet);
    startTransition(() => {
      setSet((current) =>
        hasMatchingVersion(current, nextSet) ? current : nextSet
      );
      setLoading(false);
      setError(null);
    });
  }, []);

  const loadSet = useCallback(
    async (options?: { force?: boolean }) => {
      const force = options?.force ?? false;
      if (!normalizedSetId) {
        startTransition(() => {
          setError("Mindset Set not found.");
          setLoading(false);
        });
        return;
      }

      const cached = readCachedFlashcardSet(normalizedSetId);

      startTransition(() => {
        if (cached) {
          setSet((current) =>
            hasMatchingVersion(current, cached) ? current : cached
          );
        }
        setLoading(cached === null && !loadedSetIdRef.current);
        setError(null);
      });

      if (cached && !force) {
        loadedSetIdRef.current = cached.id;
        return;
      }

      try {
        const response = await fetch(
          `/api/flashcards/sets/${normalizedSetId}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            removeCachedFlashcardSet(normalizedSetId);
          }

          setError(readMindsetError(response.status));
          setLoading(false);
          return;
        }

        const payload = (await response.json()) as {
          set?: FlashcardSetRecord;
        };

        if (!payload.set) {
          return;
        }

        applySet(payload.set);
      } catch (fetchError) {
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load Mindset Set."
        );
        setLoading(false);
      }
    },
    [applySet, normalizedSetId]
  );

  useEffect(() => {
    loadSet().catch(() => undefined);

    const onInvalidated = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          kind?: string;
        }>
      ).detail;

      if (detail?.kind !== "flashcards") {
        return;
      }

      loadSet({ force: true }).catch(() => undefined);
    };

    window.addEventListener(
      "avenire:workspace-data-invalidated",
      onInvalidated
    );

    return () => {
      window.removeEventListener(
        "avenire:workspace-data-invalidated",
        onInvalidated
      );
    };
  }, [loadSet]);

  if (loading && !set) {
    return (
      <>
        <HeaderTitle>Mindset Set</HeaderTitle>
        <DetailPageBreadcrumbs title="Opening Mindset Set" />
        <LoadingShell />
      </>
    );
  }

  if (error && !set) {
    return (
      <>
        <HeaderTitle>{error}</HeaderTitle>
        <DetailPageBreadcrumbs title={error} />
        <div className="flex h-full items-center justify-center bg-background px-4 py-8">
          <div className="w-full max-w-2xl rounded-2xl border border-border/50 bg-card/80 p-6 shadow-sm">
            <p className="text-[11px] text-muted-foreground uppercase tracking-[0.22em]">
              Mindset Set
            </p>
            <h1 className="mt-2 font-semibold text-2xl tracking-tight">
              {error}
            </h1>
            <p className="mt-2 text-muted-foreground text-sm">
              Try going back to the Mindset Sets list and opening it again.
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!set) {
    return (
      <>
        <HeaderTitle>Mindset Set</HeaderTitle>
        <DetailPageBreadcrumbs title="Opening Mindset Set" />
        <LoadingShell />
      </>
    );
  }

  return (
    <ReadyFlashcardSetDetail
      initialDrillFilters={initialDrillFilters}
      initialSet={set}
      initialStudyOpen={autoStudy}
    />
  );
}
