"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react";
import dynamic from "next/dynamic";
import {
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
  HeaderTitle,
} from "@/components/dashboard/header-portal";
import { FlashcardSetDetailActions } from "@/components/flashcards/flashcard-set-detail-actions";
import { FlashcardSetDetailCardBank } from "@/components/flashcards/flashcard-set-detail-card-bank";
import type { FlashcardSetDetailRuntime } from "@/components/flashcards/use-flashcard-set-detail";

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

          {studyOpen ? (
            <FlashcardSetDetailStudyRuntime
              drillFilters={drillFilters}
              initialQueue={initialQueue}
              onOpenChange={handleStudyOpenChange}
              onRefreshSet={loadSet}
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
