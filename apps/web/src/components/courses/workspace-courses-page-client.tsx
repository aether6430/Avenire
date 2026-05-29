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
import { Input } from "@avenire/ui/components/input";
import { Label } from "@avenire/ui/components/label";
import { Progress } from "@avenire/ui/components/progress";
import { Textarea } from "@avenire/ui/components/textarea";
import { cn } from "@avenire/ui/lib/utils";
import {
  CalendarBlank,
  CheckCircle,
  Clock,
  Flag,
  Graph,
  ListChecks,
  MapTrifold,
  Plus,
  Warning,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  HeaderActions,
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
} from "@/components/dashboard/header-portal";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import { usePaneSearchParams } from "@/lib/workspace-panes";

interface CourseMethodSummary {
  activeCourseMapId: string | null;
  currentVersionId: string | null;
  id: string;
  status: string;
  title: string;
  updatedAt: string;
}

interface ReadinessBreakdown {
  assessment: number;
  coverage: number;
  readiness: number;
  repairLoad: number;
  retention: number;
  risk: number;
}

interface CourseNode {
  estimatedEffortMinutes: number | null;
  examWeight: number;
  id: string;
  nodeType: string;
  parentId: string | null;
  readiness: ReadinessBreakdown;
  sortOrder: number;
  title: string;
  userPriority: number;
  verificationState: string;
}

interface SprintPlanItem {
  courseMapNodeId: string;
  estimatedMinutes: number;
  id: string;
  itemType: string;
  linkedTaskId: string | null;
  plannedFor: string;
  rationale: string;
  status: string;
}

interface CourseOverview {
  activeSprint: {
    deadline: string;
    id: string;
    targetReadiness: number;
    title: string;
  } | null;
  method: {
    courseMapId: string | null;
    currentVersionId: string | null;
    methodId: string;
    title: string;
  };
  nodes: CourseNode[];
  pendingPatches: unknown[];
}

interface CourseMethodsPayload {
  methods: CourseMethodSummary[];
}

interface CourseOverviewPayload {
  overview: CourseOverview;
}

interface SprintPlanPayload {
  planItems: SprintPlanItem[];
}

interface CreateCourseResponse {
  course: {
    method: {
      id: string;
    };
  };
}

async function loadCourseMethods(signal?: AbortSignal) {
  const response = await fetch("/api/course-methods", {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load course methods.");
  }

  return (await response.json()) as CourseMethodsPayload;
}

async function loadCourseOverview(methodId: string, signal?: AbortSignal) {
  const response = await fetch(`/api/course-methods/${methodId}`, {
    cache: "no-store",
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load course method.");
  }

  return (await response.json()) as CourseOverviewPayload;
}

async function loadSprintPlanItems(sprintId: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/course-methods/sprints/${sprintId}/plan-items`,
    {
      cache: "no-store",
      signal,
    }
  );

  if (!response.ok) {
    throw new Error("Unable to load sprint plan.");
  }

  return (await response.json()) as SprintPlanPayload;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
  }).format(new Date(value));
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function statusTone(value: number) {
  if (value >= 0.75) {
    return "text-success";
  }
  if (value >= 0.45) {
    return "text-warning";
  }
  return "text-destructive";
}

export function WorkspaceCoursesPageClient() {
  const queryClient = useQueryClient();
  const searchParams = usePaneSearchParams();
  const { status, user, workspace } = useWorkspaceBootstrap();
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    searchParams.get("method")
  );
  const [createOpen, setCreateOpen] = useState(
    searchParams.get("create") === "1"
  );
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSubject, setCourseSubject] = useState("");
  const [courseTopics, setCourseTopics] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);

  const methodsQuery = useQuery({
    enabled: status === "ready" && Boolean(user?.id && workspace?.workspaceId),
    queryFn: ({ signal }) => loadCourseMethods(signal),
    queryKey: ["course-methods", workspace?.workspaceId ?? null],
  });

  const selectedMethod =
    methodsQuery.data?.methods.find(
      (method) => method.id === selectedMethodId
    ) ??
    methodsQuery.data?.methods[0] ??
    null;

  const overviewQuery = useQuery({
    enabled: Boolean(selectedMethod?.id),
    queryFn: ({ signal }) =>
      loadCourseOverview(selectedMethod?.id ?? "", signal),
    queryKey: ["course-method-overview", selectedMethod?.id ?? null],
  });

  const activeSprintId = overviewQuery.data?.overview.activeSprint?.id ?? null;
  const planItemsQuery = useQuery({
    enabled: Boolean(activeSprintId),
    queryFn: ({ signal }) => loadSprintPlanItems(activeSprintId ?? "", signal),
    queryKey: ["course-sprint-plan-items", activeSprintId],
  });

  const commitMutation = useMutation({
    mutationFn: async (planItemId: string) => {
      const response = await fetch(
        `/api/course-methods/plan-items/${planItemId}/commit`,
        { method: "POST" }
      );
      if (!response.ok) {
        throw new Error("Unable to commit plan item.");
      }
      return response.json() as Promise<unknown>;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["course-sprint-plan-items", activeSprintId],
      });
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const topics = courseTopics
        .split("\n")
        .map((topic) => topic.trim())
        .filter(Boolean);
      const nodes = (topics.length > 0 ? topics : [courseTitle.trim()]).map(
        (title, index) => ({
          estimatedEffortMinutes: 30,
          examWeight: index === 0 ? 1 : 0,
          groundingState: "user_added" as const,
          nodeType: "topic" as const,
          sortOrder: index,
          title,
          userPriority: index === 0 ? 1 : 0,
          verificationState: "user_added" as const,
        })
      );

      const response = await fetch("/api/course-methods", {
        body: JSON.stringify({
          nodes,
          sourceRefs: [{ type: "manual", label: "Created in Courses" }],
          subject: courseSubject.trim() || null,
          title: courseTitle.trim(),
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Unable to create course.");
      }

      return (await response.json()) as CreateCourseResponse;
    },
    onSuccess: async (payload) => {
      setCreateOpen(false);
      setCreateError(null);
      setCourseTitle("");
      setCourseSubject("");
      setCourseTopics("");
      setSelectedMethodId(payload.course.method.id);
      await queryClient.invalidateQueries({
        queryKey: ["course-methods", workspace?.workspaceId ?? null],
      });
    },
    onError: (error) => {
      setCreateError(
        error instanceof Error ? error.message : "Unable to create course."
      );
    },
  });

  useEffect(() => {
    if (searchParams.get("create") === "1") {
      setCreateOpen(true);
      const title = searchParams.get("title")?.trim();
      if (title) {
        setCourseTitle((current) => current || title);
        setCourseTopics((current) => current || title);
      }
    }
  }, [searchParams]);

  const overview = overviewQuery.data?.overview ?? null;
  const nodes = overview?.nodes ?? [];
  const planItems = planItemsQuery.data?.planItems ?? [];
  const averageReadiness = useMemo(() => {
    if (nodes.length === 0) {
      return 0;
    }
    return (
      nodes.reduce((total, node) => total + node.readiness.readiness, 0) /
      nodes.length
    );
  }, [nodes]);
  const unverifiedCount = nodes.filter(
    (node) =>
      node.verificationState === "ai_suggested" ||
      node.verificationState === "needs_review"
  ).length;

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading Courses" />;
  }

  if (methodsQuery.isPending) {
    return <WorkspaceRoutePlaceholder label="Loading Courses" />;
  }

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <HeaderLeadingIcon>
          <MapTrifold className="size-3.5" />
        </HeaderLeadingIcon>
        <HeaderBreadcrumbs>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground text-sm">
              Courses
            </p>
          </div>
        </HeaderBreadcrumbs>
        <HeaderActions>
          <Dialog onOpenChange={setCreateOpen} open={createOpen}>
            <DialogTrigger render={<Button size="sm" type="button" />}>
              <Plus className="size-4" />
              New course
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>New course</DialogTitle>
                <DialogDescription>
                  Create the first map version. Sprints and tasks stay separate
                  until you commit work.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="course-title">Title</Label>
                  <Input
                    id="course-title"
                    onChange={(event) => setCourseTitle(event.target.value)}
                    placeholder="Physics 2 exam sprint"
                    value={courseTitle}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course-subject">Subject</Label>
                  <Input
                    id="course-subject"
                    onChange={(event) => setCourseSubject(event.target.value)}
                    placeholder="Physics"
                    value={courseSubject}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course-topics">Map topics</Label>
                  <Textarea
                    id="course-topics"
                    onChange={(event) => setCourseTopics(event.target.value)}
                    placeholder={"Gauss's law\nElectric potential\nCapacitors"}
                    rows={6}
                    value={courseTopics}
                  />
                </div>
              </div>
              {createError ? (
                <p className="text-destructive text-xs">{createError}</p>
              ) : null}
              <DialogFooter>
                <Button
                  disabled={
                    createCourseMutation.isPending || !courseTitle.trim()
                  }
                  onClick={() => createCourseMutation.mutate()}
                  type="button"
                >
                  Create course
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </HeaderActions>

        <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="min-h-0 rounded-md border border-border bg-card">
            <div className="border-border border-b px-3 py-2">
              <p className="font-medium text-sm">Course Methods</p>
            </div>
            <div className="flex flex-col p-1.5">
              {methodsQuery.data?.methods.length ? (
                methodsQuery.data.methods.map((method) => (
                  <button
                    className={cn(
                      "rounded-md px-2.5 py-2 text-left transition-colors",
                      selectedMethod?.id === method.id
                        ? "bg-accent text-foreground"
                        : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                    )}
                    key={method.id}
                    onClick={() => setSelectedMethodId(method.id)}
                    type="button"
                  >
                    <span className="block truncate font-medium text-sm">
                      {method.title}
                    </span>
                    <span className="mt-0.5 block text-xs">
                      Updated {formatDate(method.updatedAt)}
                    </span>
                  </button>
                ))
              ) : (
                <div className="px-2.5 py-8 text-muted-foreground text-sm">
                  No course methods yet.
                </div>
              )}
            </div>
          </aside>

          <main className="min-w-0">
            {selectedMethod && overview ? (
              <div className="space-y-4">
                <section className="rounded-md border border-border bg-card">
                  <div className="flex flex-col gap-4 border-border border-b p-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h1 className="truncate font-semibold text-xl">
                          {overview.method.title}
                        </h1>
                        <Badge variant="secondary">Course Method</Badge>
                      </div>
                      <p className="mt-1 max-w-2xl text-muted-foreground text-sm">
                        Map, active sprint, plan items, risks, and evidence in
                        one execution view.
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-right">
                      <Metric
                        icon={<Graph className="size-4" />}
                        label="Readiness"
                        value={formatPercent(averageReadiness)}
                        valueClassName={statusTone(averageReadiness)}
                      />
                      <Metric
                        icon={<Warning className="size-4" />}
                        label="Review"
                        value={String(unverifiedCount)}
                      />
                      <Metric
                        icon={<Flag className="size-4" />}
                        label="Patches"
                        value={String(overview.pendingPatches.length)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-0 md:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
                    <div className="border-border border-b p-4 md:border-r md:border-b-0">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-sm">Sprint queue</p>
                          <p className="text-muted-foreground text-xs">
                            Proposed work stays here until committed.
                          </p>
                        </div>
                        {overview.activeSprint ? (
                          <Badge variant="outline">
                            <CalendarBlank className="size-3.5" />
                            {formatDate(overview.activeSprint.deadline)}
                          </Badge>
                        ) : null}
                      </div>

                      {overview.activeSprint ? (
                        <div className="space-y-2">
                          {planItems.length ? (
                            planItems.slice(0, 6).map((item) => (
                              <div
                                className="grid gap-3 rounded-md border border-border bg-background p-3 md:grid-cols-[1fr_auto]"
                                key={item.id}
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <Badge variant="secondary">
                                      {item.itemType}
                                    </Badge>
                                    <span className="text-muted-foreground text-xs">
                                      {formatDate(item.plannedFor)}
                                    </span>
                                    <span className="text-muted-foreground text-xs">
                                      {item.estimatedMinutes}m
                                    </span>
                                  </div>
                                  <p className="mt-2 line-clamp-2 text-sm">
                                    {item.rationale}
                                  </p>
                                </div>
                                <Button
                                  disabled={
                                    Boolean(item.linkedTaskId) ||
                                    commitMutation.isPending
                                  }
                                  onClick={() => commitMutation.mutate(item.id)}
                                  size="sm"
                                  type="button"
                                  variant={
                                    item.linkedTaskId ? "outline" : "default"
                                  }
                                >
                                  <ListChecks className="size-4" />
                                  {item.linkedTaskId ? "Task" : "Commit"}
                                </Button>
                              </div>
                            ))
                          ) : (
                            <EmptyState label="No plan items yet" />
                          )}
                        </div>
                      ) : (
                        <EmptyState label="No active sprint" />
                      )}
                    </div>

                    <div className="p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">Readiness mix</p>
                          <p className="text-muted-foreground text-xs">
                            Derived from course learning events.
                          </p>
                        </div>
                      </div>
                      <ReadinessRows nodes={nodes} />
                    </div>
                  </div>
                </section>

                <section className="rounded-md border border-border bg-card">
                  <div className="border-border border-b px-4 py-3">
                    <p className="font-medium text-sm">Course map</p>
                  </div>
                  <div className="divide-y divide-border">
                    {nodes.map((node) => (
                      <div
                        className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_180px_120px]"
                        key={node.id}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {node.verificationState === "user_verified" ? (
                              <CheckCircle className="size-4 text-success" />
                            ) : (
                              <Clock className="size-4 text-warning" />
                            )}
                            <p className="truncate font-medium text-sm">
                              {node.title}
                            </p>
                          </div>
                          <p className="mt-1 text-muted-foreground text-xs">
                            {node.nodeType} · weight {node.examWeight} ·
                            priority {node.userPriority}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <Progress value={node.readiness.readiness * 100} />
                        </div>
                        <div
                          className={cn(
                            "font-medium text-sm",
                            statusTone(node.readiness.readiness)
                          )}
                        >
                          {formatPercent(node.readiness.readiness)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : overviewQuery.isPending && selectedMethod ? (
              <WorkspaceRoutePlaceholder label="Loading course" />
            ) : (
              <section className="rounded-md border border-border bg-card p-10">
                <EmptyState label="No course selected" />
              </section>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2">
      <div className="flex justify-end text-muted-foreground">{icon}</div>
      <p className={cn("mt-1 font-semibold text-lg", valueClassName)}>
        {value}
      </p>
      <p className="text-muted-foreground text-xs">{label}</p>
    </div>
  );
}

function ReadinessRows({ nodes }: { nodes: CourseNode[] }) {
  const average = (key: keyof ReadinessBreakdown) =>
    nodes.length
      ? nodes.reduce((total, node) => total + node.readiness[key], 0) /
        nodes.length
      : 0;
  const rows: Array<[string, number]> = [
    ["Coverage", average("coverage")],
    ["Assessment", average("assessment")],
    ["Retention", average("retention")],
    ["Risk", average("risk")],
    ["Repair load", average("repairLoad")],
  ];

  return (
    <div className="space-y-3">
      {rows.map(([label, value]) => (
        <div className="space-y-1.5" key={label}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>{label}</span>
            <span className="text-muted-foreground">
              {formatPercent(value)}
            </span>
          </div>
          <Progress value={value * 100} />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-border bg-secondary/30 px-4 py-8 text-muted-foreground text-sm">
      {label}
    </div>
  );
}
