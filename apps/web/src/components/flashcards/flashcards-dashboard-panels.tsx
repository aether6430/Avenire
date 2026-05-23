"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import { BookOpenText as BookOpenCheck } from "@phosphor-icons/react/BookOpenText";
import { Empty } from "@phosphor-icons/react/Empty";
import type { FlashcardsDashboardRuntime } from "@/components/flashcards/use-flashcards-dashboard";
import { getFlashcardEnrollmentLabel } from "./flashcard-set-detail-model";

function FlashcardsDashboardDeckList({
  runtime,
}: {
  runtime: FlashcardsDashboardRuntime;
}) {
  const content =
    runtime.orderedSets.length === 0 ? (
      <Empty className="min-h-[10rem]">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpenCheck className="size-4" />
          </EmptyMedia>
          <EmptyTitle>No Mindset Sets yet</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <EmptyDescription>
            Create a set, or let the AI generate one from a misconception or
            study prompt.
          </EmptyDescription>
        </EmptyContent>
      </Empty>
    ) : (
      runtime.orderedSets.map((set) => {
        const isSelected = set.id === runtime.selectedSetId;
        return (
          <button
            className={cn(
              "flex w-full cursor-pointer items-start justify-between gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-secondary",
              isSelected && "bg-secondary"
            )}
            key={set.id}
            onClick={() => runtime.setSelectedSetId(set.id)}
            onFocus={() => runtime.prefetchSet(set.id)}
            onMouseEnter={() => runtime.prefetchSet(set.id)}
            type="button"
          >
            <div className="min-w-0">
              <p className="truncate text-foreground text-sm">{set.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {set.dueCount + set.newCount} ready · {set.cardCount} cards
              </p>
            </div>
            {set.dueCount > 0 ? (
              <Badge className="shrink-0 rounded-md" variant="outline">
                {set.dueCount} due
              </Badge>
            ) : null}
          </button>
        );
      })
    );

  if (runtime.isMobile) {
    return <div className="space-y-2">{content}</div>;
  }

  return (
    <ScrollArea className="max-h-[16rem]">
      <div className="space-y-2 p-1">{content}</div>
    </ScrollArea>
  );
}

function FlashcardsDashboardSelectedDeck({
  runtime,
}: {
  runtime: FlashcardsDashboardRuntime;
}) {
  const { selectedSet, selectedSnapshots } = runtime;

  if (!selectedSet) {
    return (
      <div className="px-4 py-8 text-center text-muted-foreground text-xs">
        Select a Mindset Set to keep going.
      </div>
    );
  }

  return (
    <div>
      <div className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate font-medium text-base text-foreground">
              {selectedSet.title}
            </h2>
            <p className="line-clamp-2 text-muted-foreground text-sm">
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
        <div className="flex flex-wrap gap-2 border-border/50 border-y py-3">
          <Badge className="rounded-md" variant="outline">
            {selectedSet.sourceType === "ai-generated"
              ? "AI-generated"
              : "Manual"}
          </Badge>
          <Badge className="rounded-md" variant="outline">
            {getFlashcardEnrollmentLabel(selectedSet.enrollmentStatus)}
          </Badge>
          <Badge className="rounded-md" variant="outline">
            {selectedSet.cardCount} cards
          </Badge>
          <Badge className="rounded-md" variant="outline">
            {selectedSet.reviewCountToday} studied today
          </Badge>
          <Badge className="rounded-md" variant="outline">
            {selectedSet.reviewCount7d} reviews in 7d
          </Badge>
          <Badge className="rounded-md" variant="outline">
            {selectedSet.lastStudiedAt
              ? `Last ${new Date(selectedSet.lastStudiedAt).toLocaleDateString()}`
              : "Not studied yet"}
          </Badge>
          <Badge className="rounded-md" variant="outline">
            Updated {new Date(selectedSet.updatedAt).toLocaleDateString()}
          </Badge>
        </div>
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
                No cards tracked for this Mindset Set yet.
              </p>
            ) : (
              selectedSnapshots.slice(0, 3).map((snapshot) => (
                <div
                  className="rounded-md bg-secondary/40 px-3 py-3"
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
                    <Badge className="shrink-0 rounded-md" variant="outline">
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
            onClick={() => runtime.openSet(selectedSet.id)}
            onMouseEnter={() => runtime.prefetchSet(selectedSet.id)}
            type="button"
          >
            Open Mindset Set
          </Button>
          <Button
            onClick={() => runtime.openSet(selectedSet.id)}
            onMouseEnter={() => runtime.prefetchSet(selectedSet.id)}
            type="button"
            variant="outline"
          >
            Go
          </Button>
        </div>
      </div>
    </div>
  );
}

export function FlashcardsDashboardPanels({
  runtime,
}: {
  runtime: FlashcardsDashboardRuntime;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(18rem,0.88fr)_minmax(0,1.12fr)]">
        <div className="min-w-0">
          <h2 className="font-medium text-foreground text-sm">Mindset Sets</h2>
          <p className="text-muted-foreground text-xs">
            Pick a Mindset Set and jump into review.
          </p>
          <FlashcardsDashboardDeckList runtime={runtime} />
        </div>

        <div className="min-w-0">
          <FlashcardsDashboardSelectedDeck runtime={runtime} />
        </div>
      </div>

      <section className="space-y-3 border-border/50 border-t pt-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium text-foreground text-sm">
            Misconceptions
          </h2>
          <p className="text-muted-foreground text-xs">
            {runtime.activeMisconceptions.length} active
          </p>
        </div>
        {runtime.mindsetOverviewLoading ? (
          <p className="text-muted-foreground text-xs">
            Loading misconception memory...
          </p>
        ) : runtime.mindsetOverviewErrorMessage ? (
          <p className="rounded-md border border-border/60 bg-card px-3 py-3 text-muted-foreground text-sm">
            {runtime.mindsetOverviewErrorMessage}
          </p>
        ) : runtime.activeMisconceptions.length > 0 ? (
          <div className="space-y-2">
            {runtime.activeMisconceptions.slice(0, 6).map((misconception) => (
              <div
                className="grid gap-3 rounded-md border border-border/60 bg-card px-3 py-3 md:grid-cols-[minmax(10rem,0.36fr)_minmax(0,1fr)]"
                key={misconception.id}
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
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-border/60 bg-card px-3 py-3 text-muted-foreground text-sm">
            No active misconceptions yet.
          </p>
        )}
      </section>
    </div>
  );
}
