"use client";

import { Badge } from "@avenire/ui/components/badge";
import {
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@avenire/ui/components/empty";
import { Spinner } from "@avenire/ui/components/spinner";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@avenire/ui/components/tabs";
import {
  BookOpenText as BookOpenCheck,
  Warning as TriangleAlert,
} from "@phosphor-icons/react";
import { ArrowRight } from "@phosphor-icons/react/ArrowRight";
import { Empty } from "@phosphor-icons/react/Empty";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { prefetchFlashcardSet } from "@/lib/flashcard-browser-cache";
import type { ConceptDrillTarget, FlashcardSetSummary } from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";
import type { ActivityEvent, WeakPointGroup } from "./dashboard-home-model";
import {
  buildDashboardDrillQuery,
  formatDashboardRelativeTime,
  getDashboardActivityStateMessage,
} from "./dashboard-home-model";

function UpcomingFlashcardList({
  flashcardSets,
  onStartReview,
}: {
  flashcardSets: FlashcardSetSummary[];
  onStartReview: (setId: string) => void;
}) {
  const orderedSets = flashcardSets
    .slice()
    .sort(
      (left, right) =>
        right.dueCount + right.newCount - (left.dueCount + left.newCount)
    )
    .slice(0, 8);

  if (orderedSets.length === 0) {
    return (
      <div className="rounded-lg bg-secondary/50 px-4 py-10 text-center text-muted-foreground text-sm">
        Nothing is waiting right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedSets.map((set) => (
        <button
          className="flex w-full cursor-pointer items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-secondary"
          key={set.id}
          onClick={() => onStartReview(set.id)}
          onFocus={() => {
            prefetchFlashcardSet(set.id).catch(() => undefined);
          }}
          onMouseEnter={() => {
            prefetchFlashcardSet(set.id).catch(() => undefined);
          }}
          type="button"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              {set.title}
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              {set.dueCount + set.newCount} cards ready
            </p>
          </div>
          <Badge className="shrink-0 rounded-md" variant="outline">
            Start
          </Badge>
        </button>
      ))}
    </div>
  );
}

function DashboardHomeActivityList({
  activities,
  errorMessage,
  loadFailed,
  loading,
}: {
  activities: ActivityEvent[];
  errorMessage: string | null;
  loadFailed: boolean;
  loading: boolean;
}) {
  let content: ReactNode;
  const activityStateMessage = getDashboardActivityStateMessage({
    activityCount: activities.length,
    errorMessage,
    loadFailed,
    loading,
  });

  if (activityStateMessage) {
    content = (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary/50 px-4 py-10 text-center text-muted-foreground text-sm">
        {activityStateMessage.showSpinner ? (
          <Spinner className="size-4" />
        ) : null}
        {activityStateMessage.message}
      </div>
    );
  } else {
    content = activities.slice(0, 6).map((event) => (
      <Link
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-secondary"
        href={event.href as Route}
        key={event.id}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-foreground text-sm">{event.title}</p>
          {event.subtitle ? (
            <p className="mt-0.5 truncate text-muted-foreground text-xs">
              {event.subtitle}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 text-muted-foreground text-xs">
          {formatDashboardRelativeTime(event.createdAt)}
        </span>
      </Link>
    ));
  }

  return <div className="space-y-2">{content}</div>;
}

export function DashboardHomeColumns({
  activeMisconceptions,
  activityErrorMessage,
  activityLoadFailed,
  activities,
  currentUserId,
  flashcardSets,
  homeTab,
  insightsTab,
  loadingActivities,
  onHomeTabChange,
  onInsightsTabChange,
  onSelectMisconception,
  onStartReview,
  weakestDrillTarget,
  weakPointGroups,
  workspaceId,
  DashboardTaskManager,
}: {
  activeMisconceptions: MisconceptionRecord[];
  activityErrorMessage: string | null;
  activityLoadFailed: boolean;
  activities: ActivityEvent[];
  currentUserId: string;
  flashcardSets: FlashcardSetSummary[];
  homeTab: string;
  insightsTab: string;
  loadingActivities: boolean;
  onHomeTabChange: (value: string) => void;
  onInsightsTabChange: (value: string) => void;
  onSelectMisconception: (misconception: MisconceptionRecord) => void;
  onStartReview: (setId: string) => void;
  weakestDrillTarget: ConceptDrillTarget | null;
  weakPointGroups: WeakPointGroup[];
  workspaceId: string;
  DashboardTaskManager: React.ComponentType<{
    currentUserId: string;
    workspaceId: string;
  }>;
}) {
  return (
    <div className="mt-3 grid items-stretch gap-6 xl:grid-cols-[minmax(16rem,0.6fr)_minmax(0,1.4fr)]">
      <div className="flex h-[20rem] flex-col overflow-hidden sm:h-[23rem] xl:h-[26rem]">
        <Tabs
          className="flex h-full min-h-0 flex-col space-y-4"
          onValueChange={onHomeTabChange}
          value={homeTab}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent className="min-h-0" value="tasks">
            <DashboardTaskManager
              currentUserId={currentUserId}
              workspaceId={workspaceId}
            />
          </TabsContent>

          <TabsContent className="min-h-0 flex-1" value="activity">
            <div className="h-full min-h-0 overflow-y-auto pr-1">
              <DashboardHomeActivityList
                activities={activities}
                errorMessage={activityErrorMessage}
                loadFailed={activityLoadFailed}
                loading={loadingActivities}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex h-[24rem] flex-col overflow-hidden sm:h-[27rem] xl:h-[30rem]">
        <Tabs
          className="flex h-full min-h-0 flex-col space-y-4"
          onValueChange={onInsightsTabChange}
          value={insightsTab}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="weak-points">Recent concepts</TabsTrigger>
            <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>

          <TabsContent className="min-h-0 flex-1" value="weak-points">
            <div className="h-full min-h-0 overflow-y-auto pr-1">
              <div className="space-y-3">
                {weakPointGroups.length === 0 ? (
                  <Empty className="min-h-[12rem]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <BookOpenCheck className="size-4" />
                      </EmptyMedia>
                      <EmptyTitle>No recent concepts yet</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <EmptyDescription>
                        Concepts you recently struggled with or revisited will
                        surface here with drill paths.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : (
                  weakPointGroups.slice(0, 6).map((group) => {
                    const drillConcepts = group.concepts
                      .slice(0, 3)
                      .map((concept) => ({
                        concept: concept.concept,
                        subject: concept.subject,
                        topic: concept.topic,
                      }));
                    const drillHref =
                      weakestDrillTarget && drillConcepts.length > 0
                        ? `/workspace/flashcards/${weakestDrillTarget.setId}?${buildDashboardDrillQuery(
                            drillConcepts
                          )}&study=1`
                        : null;

                    return (
                      <div
                        className="rounded-lg bg-secondary/40 p-4"
                        key={`${group.subject}:${group.topic}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-foreground text-sm">
                              {group.topic}
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs">
                              {group.subject}
                            </p>
                          </div>
                          <Badge className="rounded-md" variant="outline">
                            {group.misconceptionCount} misconceptions
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {group.concepts.slice(0, 4).map((concept) => (
                            <span
                              className="rounded-md bg-secondary px-2 py-1 text-foreground text-xs"
                              key={`${concept.subject}:${concept.topic}:${concept.concept}`}
                            >
                              {concept.concept}
                            </span>
                          ))}
                        </div>
                        <div className="mt-4 flex justify-end">
                          {drillHref ? (
                            <Link
                              className="inline-flex items-center gap-1 text-foreground text-xs"
                              href={drillHref as Route}
                              onMouseEnter={() => {
                                if (weakestDrillTarget) {
                                  prefetchFlashcardSet(
                                    weakestDrillTarget.setId
                                  ).catch(() => undefined);
                                }
                              }}
                            >
                              Drill
                              <ArrowRight className="size-3.5" />
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No drill available
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent className="min-h-0 flex-1" value="misconceptions">
            <div className="h-full min-h-0 overflow-y-auto pr-1">
              <div className="space-y-3">
                {activeMisconceptions.length === 0 ? (
                  <Empty className="min-h-[12rem]">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <TriangleAlert className="size-4" />
                      </EmptyMedia>
                      <EmptyTitle>No misconceptions active</EmptyTitle>
                    </EmptyHeader>
                    <EmptyContent>
                      <EmptyDescription>
                        When a misconception is detected it will appear here
                        with the option to review, improve, or clear it.
                      </EmptyDescription>
                    </EmptyContent>
                  </Empty>
                ) : (
                  activeMisconceptions.slice(0, 8).map((misconception) => (
                    <button
                      className="w-full cursor-pointer rounded-lg px-4 py-3 text-left transition-colors hover:bg-secondary"
                      key={misconception.id}
                      onClick={() => onSelectMisconception(misconception)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground text-sm">
                            {misconception.concept}
                          </p>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {misconception.subject} / {misconception.topic}
                          </p>
                        </div>
                        <Badge className="rounded-md" variant="outline">
                          {Math.round(misconception.confidence * 100)}%
                        </Badge>
                      </div>
                      <p className="mt-2 line-clamp-2 text-muted-foreground text-xs">
                        {misconception.reason}
                      </p>
                    </button>
                  ))
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent className="min-h-0 flex-1" value="upcoming">
            <div className="h-full min-h-0 overflow-y-auto pr-1">
              <UpcomingFlashcardList
                flashcardSets={flashcardSets}
                onStartReview={onStartReview}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
