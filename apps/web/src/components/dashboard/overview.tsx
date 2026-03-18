"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Card, CardContent, CardHeader } from "@avenire/ui/components/card";
import {
  Activity,
  ArrowRight,
  BookOpenCheck,
  FileText,
  MessageSquareText,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardTaskManager } from "@/components/dashboard/task-manager";
import { RevisionCalendar } from "@/components/revision-calendar";
import type { ChatSummary } from "@/lib/chat-data";
import type { ExplorerFileRecord } from "@/lib/file-data";
import type { FlashcardSetSummary } from "@/lib/flashcards";

type ActivityEvent = {
  id: string;
  type: "chat" | "file" | "flashcard" | "note";
  action: "created" | "updated" | "reviewed";
  title: string;
  subtitle?: string;
  href: string;
  createdAt: string;
};

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
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ActivityItem({ event }: { event: ActivityEvent }) {
  const typeIcon = {
    chat: MessageSquareText,
    file: FileText,
    flashcard: BookOpenCheck,
    note: FileText,
  };
  const Icon = typeIcon[event.type];

  return (
    <Link
      className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
      href={event.href as Route}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-foreground">{event.title}</p>
        {event.subtitle && (
          <p className="text-muted-foreground text-xs">{event.subtitle}</p>
        )}
      </div>
      <span className="shrink-0 text-muted-foreground text-xs">
        {formatRelativeTime(event.createdAt)}
      </span>
    </Link>
  );
}

export function DashboardOverview({
  chats,
  files,
  flashcardSets,
  studySessions: _studySessions,
  userName,
}: {
  chats: ChatSummary[];
  files: ExplorerFileRecord[];
  flashcardSets: FlashcardSetSummary[];
  studySessions: Array<{ day: string; count: number }>;
  userName?: string;
}) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  const dueTotal = flashcardSets.reduce((sum, set) => sum + set.dueCount, 0);
  const newTotal = flashcardSets.reduce((sum, set) => sum + set.newCount, 0);
  const noteCount = files.filter((file) => file.isNote).length;
  const activeSetCount = flashcardSets.filter(
    (set) => set.dueCount > 0 || set.newCount > 0
  ).length;
  const recentChats = chats.slice(0, 4);
  const recentFiles = files.slice(0, 4);

  useEffect(() => {
    const loadActivities = async () => {
      try {
        const response = await fetch("/api/activity?limit=5");
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

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <div className="overflow-hidden rounded-lg border border-border bg-muted/10">
          <img
            alt="Workspace banner"
            className="h-40 w-full object-cover md:h-48"
            height={192}
            src="/images/folder-banner-default.svg"
            width={1200}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs transition-colors hover:bg-muted/60"
            href={"/dashboard/chats" as Route}
          >
            <MessageSquareText className="size-3.5 text-muted-foreground" />
            Chats
          </Link>
          <Link
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs transition-colors hover:bg-muted/60"
            href={"/dashboard/files" as Route}
          >
            <FileText className="size-3.5 text-muted-foreground" />
            Files
          </Link>
          <Link
            className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 text-xs transition-colors hover:bg-muted/60"
            href={"/dashboard/flashcards" as Route}
          >
            <BookOpenCheck className="size-3.5 text-muted-foreground" />
            Flashcards
          </Link>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-muted-foreground text-xs">Welcome back</p>
              <h1 className="mt-0.5 text-2xl font-semibold leading-none tracking-tight sm:text-[2rem]">
                {userName ? `Hey ${userName}!` : "hey there"}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className="text-xs" variant="outline">
                {dueTotal} cards due
              </Badge>
              <Badge className="text-xs" variant="secondary">
                {noteCount} notes
              </Badge>
              <Badge className="text-xs" variant="outline">
                {activeSetCount} active sets
              </Badge>
            </div>
          </div>
          <p className="mt-2 max-w-2xl text-muted-foreground text-sm">
            Keep moving on tasks, review what is due, and jump back into the
            files or chats you touched most recently.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <div className="grid gap-4 self-start">
            <DashboardTaskManager />

            <Card className="self-start">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground text-sm">
                    Current Work
                  </p>
                  <Link
                    className="inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                    href={"/dashboard/files" as Route}
                  >
                    Open files
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Recent chats</p>
                  {recentChats.length > 0 ? (
                    <div className="space-y-1">
                      {recentChats.map((chat) => (
                        <Link
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                          href={`/dashboard/chats/${chat.slug}` as Route}
                          key={chat.id}
                        >
                          <MessageSquareText className="size-4 text-muted-foreground" />
                          <span className="min-w-0 truncate">{chat.title}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">No chats yet.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Recent files</p>
                  {recentFiles.length > 0 ? (
                    <div className="space-y-1">
                      {recentFiles.map((file) => (
                        <Link
                          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60"
                          href={
                            file.folderId
                              ? (`/dashboard/files/${file.workspaceId}/folder/${file.folderId}?file=${file.id}` as Route)
                              : (`/dashboard/files/${file.workspaceId}` as Route)
                          }
                          key={file.id}
                        >
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="min-w-0 truncate">{file.name}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-xs">No files yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 self-start">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-foreground text-sm">
                    Recent Activity
                  </p>
                </div>
              </CardHeader>
              <CardContent className="space-y-1">
                {loadingActivities && (
                  <div className="text-muted-foreground text-xs">
                    Loading activity...
                  </div>
                )}
                {!loadingActivities && activities.length === 0 && (
                  <div className="text-muted-foreground text-xs">
                    No recent activity.
                  </div>
                )}
                {!loadingActivities &&
                  activities.length > 0 &&
                  activities
                    .slice(0, 5)
                    .map((event) => (
                      <ActivityItem event={event} key={event.id} />
                    ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-foreground text-sm">
                    Study
                  </p>
                  <Link
                    className="inline-flex items-center gap-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
                    href={"/dashboard/flashcards" as Route}
                  >
                    Flashcards
                    <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="outline">{dueTotal} due</Badge>
                  <Badge variant="secondary">{newTotal} new</Badge>
                </div>
                {flashcardSets[0] ? (
                  <div className="rounded-lg border border-border/70 bg-muted/20 p-3">
                    <p className="font-medium text-foreground text-sm">
                      {flashcardSets[0].title}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      {flashcardSets[0].dueCount + flashcardSets[0].newCount}{" "}
                      cards waiting
                    </p>
                    <Link
                      className="mt-3 inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border bg-transparent px-2 text-xs/relaxed transition-colors hover:bg-muted/50"
                      href={
                        `/dashboard/flashcards/${flashcardSets[0].id}` as Route
                      }
                    >
                      Start review
                      <ArrowRight className="size-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-border/70 bg-muted/10 p-3 text-muted-foreground text-xs">
                    No flashcards due right now.
                  </div>
                )}
                <div className="rounded-lg border border-border/70 bg-muted/10 p-3">
                  <RevisionCalendar />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
