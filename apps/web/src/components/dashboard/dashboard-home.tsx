"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@avenire/ui/components/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@avenire/ui/components/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@avenire/ui/components/tabs";
import {
  ArrowRight,
  BookOpenCheck,
  FileText,
  MessageSquareText,
  Plus,
  TriangleAlert,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useMemo, useState } from "react";
import { DashboardTaskManager } from "@/components/dashboard/task-manager";
import { QuickCaptureDialog } from "@/components/dashboard/quick-capture-dialog";
import { WorkspaceHeader } from "@/components/dashboard/workspace-header";
import { RevisionCalendar } from "@/components/revision-calendar";
import type { ChatSummary } from "@/lib/chat-data";
import type { ExplorerFileRecord } from "@/lib/file-data";
import type {
  ConceptDrillTarget,
  ConceptMasteryRecord,
  ConceptMasterySubjectRecord,
  FlashcardSetSummary,
  FlashcardTaxonomy,
} from "@/lib/flashcards";
import type { MisconceptionRecord } from "@/lib/learning-data";
import { useWorkspaceHistoryStore } from "@/stores/workspaceHistoryStore";

interface DashboardHomeProps {
  activeMisconceptions: MisconceptionRecord[];
  chats: ChatSummary[];
  files: ExplorerFileRecord[];
  flashcardSets: FlashcardSetSummary[];
  masteryConcepts: ConceptMasteryRecord[];
  masterySelectedSubject: string | null;
  masterySubjects: ConceptMasterySubjectRecord[];
  studySessions: Array<{ count: number; day: string }>;
  userName?: string;
  weakestConcepts: ConceptMasteryRecord[];
  weakestDrillTarget: ConceptDrillTarget | null;
}

interface ActivityEvent {
  action: "created" | "updated" | "reviewed";
  createdAt: string;
  href: string;
  id: string;
  subtitle?: string;
  title: string;
  type: "chat" | "file" | "flashcard" | "note";
}

interface WeakPointGroup {
  concepts: ConceptMasteryRecord[];
  misconceptionCount: number;
  subject: string;
  topic: string;
}

function buildDrillQuery(concepts: FlashcardTaxonomy[]) {
  const params = new URLSearchParams();
  for (const concept of concepts) {
    params.append("drill", JSON.stringify(concept));
  }
  return params.toString();
}

function formatRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return then.toLocaleDateString("en-US", { day: "numeric", month: "short" });
}

function groupWeakPoints(
  concepts: ConceptMasteryRecord[],
  misconceptions: MisconceptionRecord[]
) {
  const byTopic = new Map<string, WeakPointGroup>();

  for (const concept of concepts) {
    const key = `${concept.subject}::${concept.topic}`;
    const existing = byTopic.get(key) ?? {
      concepts: [],
      misconceptionCount: 0,
      subject: concept.subject,
      topic: concept.topic,
    };
    existing.concepts.push(concept);
    existing.concepts.sort((left, right) => left.score - right.score);
    existing.misconceptionCount = misconceptions.filter(
      (item) =>
        item.subject === concept.subject &&
        item.topic === concept.topic &&
        item.active
    ).length;
    byTopic.set(key, existing);
  }

  return Array.from(byTopic.values()).sort((left, right) => {
    const leftScore =
      left.concepts.reduce((sum, concept) => sum + concept.score, 0) /
      Math.max(left.concepts.length, 1);
    const rightScore =
      right.concepts.reduce((sum, concept) => sum + concept.score, 0) /
      Math.max(right.concepts.length, 1);

    if (leftScore !== rightScore) {
      return leftScore - rightScore;
    }

    return `${left.subject}::${left.topic}`.localeCompare(
      `${right.subject}::${right.topic}`
    );
  });
}

function UpcomingFlashcardList({
  flashcardSets,
  onStartReview,
}: {
  flashcardSets: FlashcardSetSummary[];
  onStartReview: (setId: string) => void;
}) {
  const orderedSets = flashcardSets
    .slice()
    .sort((left, right) => right.dueCount + right.newCount - (left.dueCount + left.newCount))
    .slice(0, 8);

  if (orderedSets.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-muted-foreground text-sm">
        Nothing is waiting right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {orderedSets.map((set) => (
        <button
          className="flex w-full items-start justify-between gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 text-left transition-colors hover:bg-muted/40"
          key={set.id}
          onClick={() => onStartReview(set.id)}
          type="button"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {set.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {set.dueCount + set.newCount} cards ready
            </p>
          </div>
          <Badge className="shrink-0 rounded-sm" variant="outline">
            Start
          </Badge>
        </button>
      ))}
    </div>
  );
}

export function DashboardHome({
  activeMisconceptions,
  chats: _chats,
  files: _files,
  flashcardSets,
  masteryConcepts: _masteryConcepts,
  masterySelectedSubject: _masterySelectedSubject,
  masterySubjects: _masterySubjects,
  studySessions: _studySessions,
  userName,
  weakestConcepts,
  weakestDrillTarget,
}: DashboardHomeProps) {
  const router = useRouter();
  const recordRoute = useWorkspaceHistoryStore((state) => state.recordRoute);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [selectedMisconception, setSelectedMisconception] =
    useState<MisconceptionRecord | null>(null);

  const weakPointGroups = useMemo(
    () => groupWeakPoints(weakestConcepts, activeMisconceptions),
    [activeMisconceptions, weakestConcepts]
  );

  useEffect(() => {
    recordRoute("/workspace");
  }, [recordRoute]);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch("/api/activity?limit=6");
        if (response.ok) {
          const data = (await response.json()) as { events: ActivityEvent[] };
          setActivities(data.events);
        }
      } catch {
        // ignore
      } finally {
        setLoadingActivities(false);
      }
    };

    loadActivities().catch(() => undefined);
  }, []);

  const promptForMisconception = (misconception: MisconceptionRecord) =>
    encodeURIComponent(
      `Help me fix this misconception.\n\nConcept: ${misconception.concept}\nSubject: ${misconception.subject}\nTopic: ${misconception.topic}\nReason: ${misconception.reason}\n\nFirst check the current misconception context, then teach the correct model, and test me with a few questions.`
    );

  const promptForFlashcards = (misconception: MisconceptionRecord) =>
    encodeURIComponent(
      `Generate a flashcard set from this misconception and focus on correcting the wrong model.\n\nConcept: ${misconception.concept}\nSubject: ${misconception.subject}\nTopic: ${misconception.topic}\nReason: ${misconception.reason}\n\nUse the misconception tools if needed, then create the flashcard set from the wrong model and the corrected model.`
    );

  const resolveMisconception = async (misconception: MisconceptionRecord) => {
    const response = await fetch("/api/misconceptions/resolve", {
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
      router.refresh();
    }
  };

  const startReview = (setId: string) => {
    startTransition(() => {
      router.push(`/workspace/flashcards/${setId}?study=1` as Route);
    });
  };

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-none flex-col gap-5 px-4 py-4 md:px-6">
        <WorkspaceHeader className="-mx-4 md:-mx-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              Desktop
            </p>
          </div>
        </WorkspaceHeader>

        <div className="-mx-4 overflow-hidden border-y border-border/70 md:-mx-6">
          <img
            alt="Workspace banner"
            className="h-36 w-full object-cover md:h-48"
            height={192}
            src="/images/folder-banner-default.svg"
            width={2400}
          />
        </div>

        <div className="flex flex-col gap-3 md:flex-row">
          <QuickCaptureDialog
            initialKind="task"
            trigger={
              <Button className="h-10 flex-1 justify-center" type="button" variant="outline">
                <Plus className="size-4" />
                Task
              </Button>
            }
          />
          <QuickCaptureDialog
            initialKind="note"
            trigger={
              <Button className="h-10 flex-1 justify-center" type="button" variant="outline">
                <FileText className="size-4" />
                Note
              </Button>
            }
          />
          <QuickCaptureDialog
            initialKind="misconception"
            trigger={
              <Button className="h-10 flex-1 justify-center" type="button" variant="outline">
                <TriangleAlert className="size-4" />
                Misconception
              </Button>
            }
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-4">
          <p className="text-sm text-muted-foreground">Hey {userName ?? "there"}! Welcome back!</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)]">
          <Card className="overflow-hidden">
            <CardHeader className="border-border/70 border-b pb-3">
              <CardTitle className="text-sm">Study focus</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="weak-points" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="weak-points">Weak points</TabsTrigger>
                  <TabsTrigger value="misconceptions">Misconceptions</TabsTrigger>
                  <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                </TabsList>

                <TabsContent value="weak-points" className="space-y-3">
                  {weakPointGroups.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                      No weak points yet.
                    </div>
                  ) : (
                    weakPointGroups.slice(0, 6).map((group) => {
                      const drillConcepts = group.concepts.slice(0, 3).map((concept) => ({
                        concept: concept.concept,
                        subject: concept.subject,
                        topic: concept.topic,
                      }));
                      const drillHref =
                        weakestDrillTarget && drillConcepts.length > 0
                          ? `/workspace/flashcards/${weakestDrillTarget.setId}?${buildDrillQuery(drillConcepts)}&study=1`
                          : null;

                      return (
                        <div
                          className="rounded-xl border border-border/70 bg-background p-4"
                          key={`${group.subject}:${group.topic}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-foreground">
                                {group.topic}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {group.subject}
                              </p>
                            </div>
                            <Badge className="rounded-sm" variant="outline">
                              {group.misconceptionCount} misconceptions
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {group.concepts.slice(0, 4).map((concept) => (
                              <span
                                className="rounded-md border border-border/70 bg-muted/20 px-2 py-1 text-xs text-foreground"
                                key={`${concept.subject}:${concept.topic}:${concept.concept}`}
                              >
                                {concept.concept}
                              </span>
                            ))}
                          </div>
                          <div className="mt-4 flex justify-end">
                            {drillHref ? (
                              <Link className="inline-flex items-center gap-1 text-xs text-foreground" href={drillHref as Route}>
                                Drill
                                <ArrowRight className="size-3.5" />
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground">No drill available</span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                <TabsContent value="misconceptions" className="space-y-3">
                  {activeMisconceptions.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
                      No active misconceptions.
                    </div>
                  ) : (
                    activeMisconceptions.slice(0, 8).map((misconception) => (
                      <button
                        className="w-full rounded-xl border border-border/70 bg-background px-4 py-4 text-left transition-colors hover:bg-muted/40"
                        key={misconception.id}
                        onClick={() => setSelectedMisconception(misconception)}
                        type="button"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">
                              {misconception.concept}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {misconception.subject} / {misconception.topic}
                            </p>
                          </div>
                          <Badge className="rounded-sm" variant="outline">
                            {Math.round(misconception.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {misconception.reason}
                        </p>
                      </button>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="upcoming" className="space-y-3">
                  <UpcomingFlashcardList
                    flashcardSets={flashcardSets}
                    onStartReview={startReview}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader className="border-border/70 border-b pb-3">
              <CardTitle className="text-sm">Work</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Tabs defaultValue="tasks" className="space-y-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="tasks">Tasks</TabsTrigger>
                  <TabsTrigger value="activity">Activity</TabsTrigger>
                </TabsList>

                <TabsContent value="tasks">
                  <DashboardTaskManager />
                </TabsContent>

                <TabsContent value="activity" className="space-y-2">
                  {loadingActivities ? (
                    <div className="rounded-lg border border-border/70 bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                      Loading activity...
                    </div>
                  ) : activities.length === 0 ? (
                    <div className="rounded-lg border border-border/70 bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                      No recent activity.
                    </div>
                  ) : (
                    activities.slice(0, 6).map((event) => (
                      <Link
                        className="flex items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 transition-colors hover:bg-muted/40"
                        href={event.href as Route}
                        key={event.id}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-foreground">
                            {event.title}
                          </p>
                          {event.subtitle ? (
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {event.subtitle}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {formatRelativeTime(event.createdAt)}
                        </span>
                      </Link>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="border-border/70 border-b pb-3">
            <CardTitle className="text-sm">Upcoming flashcards</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <RevisionCalendar />
          </CardContent>
        </Card>
      </div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMisconception(null);
          }
        }}
        open={selectedMisconception !== null}
      >
        <DialogContent className="max-w-2xl">
          {selectedMisconception ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMisconception.concept}</DialogTitle>
                <DialogDescription>
                  {selectedMisconception.subject} / {selectedMisconception.topic}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-foreground">
                  {selectedMisconception.reason}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge className="rounded-sm" variant="outline">
                    Confidence {Math.round(selectedMisconception.confidence * 100)}%
                  </Badge>
                  <Badge className="rounded-sm" variant="outline">
                    {selectedMisconception.source}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => {
                      const prompt = promptForMisconception(selectedMisconception);
                      router.push(`/workspace/chats/new?prompt=${prompt}` as Route);
                    }}
                    type="button"
                  >
                    <MessageSquareText className="size-4" />
                    Chat with AI
                  </Button>
                  <Button
                    onClick={() => {
                      const prompt = promptForFlashcards(selectedMisconception);
                      router.push(`/workspace/chats/new?prompt=${prompt}` as Route);
                    }}
                    type="button"
                    variant="outline"
                  >
                    <BookOpenCheck className="size-4" />
                    Generate flashcards
                  </Button>
                  <Button
                    onClick={() => {
                      fetch("/api/misconceptions/improve", {
                        body: JSON.stringify({
                          concept: selectedMisconception.concept,
                          subject: selectedMisconception.subject,
                          topic: selectedMisconception.topic,
                        }),
                        headers: { "Content-Type": "application/json" },
                        method: "POST",
                      })
                        .then((response) => {
                          if (!response.ok) {
                            throw new Error("Unable to improve misconception.");
                          }
                          return response.json();
                        })
                        .then(() => {
                          setSelectedMisconception(null);
                          router.refresh();
                        })
                        .catch(() => undefined);
                    }}
                    type="button"
                    variant="outline"
                  >
                    Improve mastery
                  </Button>
                  <Button
                    onClick={() => {
                      resolveMisconception(selectedMisconception).catch(() => undefined);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Clear misconception
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
