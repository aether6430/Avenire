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
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowsOutCardinal,
  CalendarBlank,
  CaretDown,
  CaretRight,
  CheckCircle,
  Clock,
  FileText,
  Flag,
  Graph,
  ListChecks,
  MapTrifold,
  MagnifyingGlass,
  Plus,
  Sparkle,
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

interface DraftOutlineNode {
  estimatedEffortMinutes: number;
  examWeight: number;
  focusRecommended: boolean;
  groundingState: "ai_suggested" | "user_added";
  id: string;
  nodeType: "module" | "topic" | "subtopic";
  parentId: string | null;
  riskPrompts: string[];
  sortOrder: number;
  sourceRefs: Array<{
    label?: string;
    type: "manual" | "url" | "file" | "note";
    url?: string;
  }>;
  title: string;
  userPriority: number;
  verificationState: "ai_suggested" | "needs_review" | "user_added";
}

interface GenerateOutlinePayload {
  outline: {
    nodes: DraftOutlineNode[];
    sourceRefs: DraftOutlineNode["sourceRefs"];
    summary: {
      focusCount: number;
      groundedCount: number;
      sourceCount: number;
    };
    title: string;
  };
  sourceErrors: string[];
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

function remapDraftNodesForCreation(nodes: DraftOutlineNode[]) {
  const idByDraftId = new Map(
    nodes.map((node) => [node.id, crypto.randomUUID()])
  );

  return nodes.map((node, index) => ({
    difficulty: null,
    estimatedEffortMinutes: node.estimatedEffortMinutes,
    examWeight: node.examWeight,
    groundingState: node.groundingState,
    id: idByDraftId.get(node.id),
    nodeType: node.nodeType,
    parentId: node.parentId ? (idByDraftId.get(node.parentId) ?? null) : null,
    prerequisiteNodeIds: [],
    sortOrder: index,
    sourceRefs: [
      ...node.sourceRefs,
      ...node.riskPrompts.slice(0, 1).map((prompt) => ({
        label: `Risk area: ${prompt}`,
        type: "manual" as const,
      })),
    ],
    taxonomyConcept: node.title,
    taxonomySubject: null,
    taxonomyTopic: null,
    title: node.title,
    userPriority: node.userPriority,
    verificationState: node.verificationState,
  }));
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
  const [courseExam, setCourseExam] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [courseTopic, setCourseTopic] = useState("");
  const [courseMaterial, setCourseMaterial] = useState("");
  const [courseTopics, setCourseTopics] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [outlineNodes, setOutlineNodes] = useState<DraftOutlineNode[]>([]);
  const [outlineSourceErrors, setOutlineSourceErrors] = useState<string[]>([]);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

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

  const generateOutlineMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/course-methods/generate-outline", {
        body: JSON.stringify({
          docText: courseMaterial.trim() || undefined,
          exam: courseExam.trim() || undefined,
          subtopics: courseTopics.trim() || undefined,
          topic: courseTopic.trim() || courseTitle.trim(),
          useWeb: true,
          useWorkspace: true,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Unable to generate outline.");
      }

      return (await response.json()) as GenerateOutlinePayload;
    },
    onSuccess: (payload) => {
      setCourseTitle((current) => current || payload.outline.title);
      setOutlineNodes(payload.outline.nodes);
      setOutlineSourceErrors(payload.sourceErrors);
      setCreateError(null);
    },
    onError: (error) => {
      setCreateError(
        error instanceof Error ? error.message : "Unable to generate outline."
      );
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: async () => {
      const title =
        courseTitle.trim() ||
        [courseExam.trim(), courseTopic.trim()].filter(Boolean).join(" ") ||
        outlineNodes[0]?.title?.trim();
      const nodes =
        outlineNodes.length > 0
          ? remapDraftNodesForCreation(outlineNodes)
          : (courseTopics
              .split("\n")
              .map((topic) => topic.trim())
              .filter(Boolean).length
              ? courseTopics
                  .split("\n")
                  .map((topic) => topic.trim())
                  .filter(Boolean)
              : [title]
            ).map((nodeTitle, index) => ({
              estimatedEffortMinutes: 30,
              examWeight: index === 0 ? 1 : 0,
              groundingState: "user_added" as const,
              nodeType: "topic" as const,
              sortOrder: index,
              title: nodeTitle,
              userPriority: index === 0 ? 1 : 0,
              verificationState: "user_added" as const,
            }));

      const response = await fetch("/api/course-methods", {
        body: JSON.stringify({
          nodes,
          sourceRefs: [
            { type: "manual", label: "Created from course outline builder" },
          ],
          subject: courseTopic.trim() || null,
          title,
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
      setCourseExam("");
      setCourseMaterial("");
      setCourseTitle("");
      setCourseTopic("");
      setCourseTopics("");
      setOutlineNodes([]);
      setOutlineSourceErrors([]);
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
        setCourseTopic((current) => current || title);
      }
    }
  }, [searchParams]);

  const updateOutlineNode = (
    nodeId: string,
    patch: Partial<DraftOutlineNode>
  ) => {
    setOutlineNodes((current) =>
      current.map((node) => (node.id === nodeId ? { ...node, ...patch } : node))
    );
  };

  const handleOutlineDragEnd = (event: DragEndEvent) => {
    const activeId = String(event.active.id);
    const overId = event.over ? String(event.over.id) : null;
    if (!overId || activeId === overId || !activeId.startsWith("outline:")) {
      return;
    }

    const draggedId = activeId.replace("outline:", "");
    const dropTarget = overId.replace(/^outline-drop:/, "");
    const childTarget = overId.startsWith("outline-child:")
      ? overId.replace("outline-child:", "")
      : null;

    setOutlineNodes((current) => {
      const dragged = current.find((node) => node.id === draggedId);
      if (!dragged) {
        return current;
      }

      const withoutDragged = current.filter((node) => node.id !== draggedId);
      const targetId = childTarget ?? dropTarget;
      const targetIndex = withoutDragged.findIndex(
        (node) => node.id === targetId
      );
      if (targetIndex < 0) {
        return current;
      }

      const target = withoutDragged[targetIndex];
      const nextDragged = {
        ...dragged,
        parentId: childTarget ? target.id : target.parentId,
        nodeType:
          childTarget && dragged.nodeType === "module"
            ? ("topic" as const)
            : dragged.nodeType,
      };
      const next = [...withoutDragged];
      next.splice(childTarget ? targetIndex + 1 : targetIndex, 0, nextDragged);
      return next.map((node, index) => ({ ...node, sortOrder: index }));
    });
  };

  const canGenerateOutline = Boolean(
    (courseTopic.trim() || courseTitle.trim()) &&
      !generateOutlineMutation.isPending
  );
  const canCreateCourse = Boolean(
    (courseTitle.trim() || courseTopic.trim() || outlineNodes[0]?.title) &&
      !createCourseMutation.isPending
  );

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
            <DialogContent className="max-h-[88vh] max-w-5xl overflow-hidden p-0">
              <DialogHeader>
                <div className="border-border border-b px-5 py-4">
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkle className="size-4 text-primary" />
                    Generate Course Method
                  </DialogTitle>
                  <DialogDescription>
                    Start with an exam and topic, then review the draft map
                    before it becomes a Course Method.
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="grid min-h-0 gap-0 overflow-hidden lg:grid-cols-[340px_minmax(0,1fr)]">
                <div className="space-y-4 overflow-y-auto border-border border-b p-5 lg:border-r lg:border-b-0">
                  <div className="space-y-1.5">
                    <Label htmlFor="course-exam">Exam</Label>
                    <Input
                      id="course-exam"
                      onChange={(event) => setCourseExam(event.target.value)}
                      placeholder="A Level Physics"
                      value={courseExam}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="course-topic">Topic</Label>
                    <Input
                      id="course-topic"
                      onChange={(event) => setCourseTopic(event.target.value)}
                      placeholder="Mechanics"
                      value={courseTopic}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="course-title">Course title</Label>
                    <Input
                      id="course-title"
                      onChange={(event) => setCourseTitle(event.target.value)}
                      placeholder="A Level Mechanics"
                      value={courseTitle}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="course-topics">Optional subtopics</Label>
                    <Textarea
                      id="course-topics"
                      onChange={(event) => setCourseTopics(event.target.value)}
                      placeholder={
                        "Forces and motion\nMoments\nCircular motion"
                      }
                      rows={7}
                      value={courseTopics}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="course-material">
                      Optional source notes
                    </Label>
                    <Textarea
                      id="course-material"
                      onChange={(event) =>
                        setCourseMaterial(event.target.value)
                      }
                      placeholder="Paste syllabus points or document excerpts"
                      rows={5}
                      value={courseMaterial}
                    />
                  </div>
                  <Button
                    className="w-full"
                    disabled={!canGenerateOutline}
                    onClick={() => generateOutlineMutation.mutate()}
                    type="button"
                  >
                    <MagnifyingGlass className="size-4" />
                    {generateOutlineMutation.isPending
                      ? "Generating"
                      : "Generate outline"}
                  </Button>
                  {outlineSourceErrors.length ? (
                    <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-warning text-xs">
                      {outlineSourceErrors[0]}
                    </div>
                  ) : null}
                </div>

                <div className="min-h-[520px] overflow-y-auto p-5">
                  {outlineNodes.length ? (
                    <DndContext
                      collisionDetection={closestCenter}
                      onDragEnd={handleOutlineDragEnd}
                      sensors={sensors}
                    >
                      <div className="mb-4 grid gap-2 md:grid-cols-3">
                        <OutlineStat
                          icon={<MapTrifold className="size-4" />}
                          label="Nodes"
                          value={String(outlineNodes.length)}
                        />
                        <OutlineStat
                          icon={<Flag className="size-4" />}
                          label="Focus"
                          value={String(
                            outlineNodes.filter((node) => node.focusRecommended)
                              .length
                          )}
                        />
                        <OutlineStat
                          icon={<FileText className="size-4" />}
                          label="Grounded"
                          value={String(
                            outlineNodes.filter(
                              (node) => node.sourceRefs.length > 0
                            ).length
                          )}
                        />
                      </div>
                      <div className="divide-y divide-border rounded-md border border-border">
                        {outlineNodes.map((node) => (
                          <OutlineNodeRow
                            key={node.id}
                            node={node}
                            onChange={updateOutlineNode}
                          />
                        ))}
                      </div>
                    </DndContext>
                  ) : (
                    <div className="flex min-h-[460px] flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-secondary/30 px-6 text-center">
                      <Sparkle className="size-8 text-primary" />
                      <div>
                        <p className="font-medium text-sm">
                          Generate a draft map
                        </p>
                        <p className="mt-1 max-w-sm text-muted-foreground text-sm">
                          If subtopics are blank, the outline is assembled from
                          workspace retrieval and web search results.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {createError ? (
                <p className="px-5 text-destructive text-xs">{createError}</p>
              ) : null}
              <DialogFooter className="border-border border-t px-5 py-4">
                <Button
                  disabled={!canCreateCourse}
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

function OutlineStat({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <p className="mt-1 font-semibold text-lg">{value}</p>
    </div>
  );
}

function OutlineNodeRow({
  node,
  onChange,
}: {
  node: DraftOutlineNode;
  onChange: (nodeId: string, patch: Partial<DraftOutlineNode>) => void;
}) {
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef: setDragRef,
    transform,
  } = useDraggable({ id: `outline:${node.id}` });
  const { isOver: isRowOver, setNodeRef: setRowDropRef } = useDroppable({
    id: `outline-drop:${node.id}`,
  });
  const { isOver: isChildOver, setNodeRef: setChildDropRef } = useDroppable({
    id: `outline-child:${node.id}`,
  });
  const depth = node.parentId ? 1 : 0;
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      className={cn(
        "bg-card transition-colors",
        isRowOver ? "bg-accent/50" : null,
        isDragging ? "relative z-20 opacity-80" : null
      )}
      ref={setRowDropRef}
    >
      <div
        className="grid min-h-16 gap-3 px-3 py-2 md:grid-cols-[minmax(0,1fr)_150px_130px]"
        ref={setDragRef}
        style={{ ...style, paddingLeft: `${12 + depth * 24}px` }}
      >
        <div className="flex min-w-0 items-start gap-2">
          <button
            aria-label={`Drag ${node.title}`}
            className="mt-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            type="button"
            {...attributes}
            {...listeners}
          >
            <ArrowsOutCardinal className="size-4" />
          </button>
          <button
            aria-label={
              node.parentId ? "Make top-level topic" : "Keep as top-level topic"
            }
            className="mt-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            disabled={!node.parentId}
            onClick={() => onChange(node.id, { parentId: null })}
            type="button"
          >
            {node.parentId ? (
              <CaretRight className="size-4" />
            ) : (
              <CaretDown className="size-4" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <Input
              aria-label="Topic title"
              className="h-8 border-transparent bg-transparent px-0 font-medium text-sm shadow-none focus-visible:border-input focus-visible:px-2"
              onChange={(event) =>
                onChange(node.id, { title: event.target.value })
              }
              value={node.title}
            />
            <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
              <Badge variant="secondary">{node.nodeType}</Badge>
              <span>{node.sourceRefs.length} sources</span>
              {node.verificationState === "needs_review" ? (
                <span className="text-warning">needs review</span>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              aria-label={`Set importance ${value}`}
              className={cn(
                "h-7 w-7 rounded border border-border text-xs transition-colors",
                node.userPriority >= value
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent"
              )}
              key={value}
              onClick={() =>
                onChange(node.id, {
                  examWeight: value / 5,
                  userPriority: value,
                })
              }
              type="button"
            >
              {value}
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            className={cn(
              "rounded-md border px-2.5 py-1.5 text-xs transition-colors",
              node.focusRecommended
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-accent"
            )}
            onClick={() =>
              onChange(node.id, { focusRecommended: !node.focusRecommended })
            }
            type="button"
          >
            Focus
          </button>
          <div
            className={cn(
              "h-7 flex-1 rounded border border-dashed text-center text-muted-foreground text-xs leading-7",
              isChildOver
                ? "border-primary bg-primary/10 text-foreground"
                : null
            )}
            ref={setChildDropRef}
          >
            Drop under
          </div>
        </div>
      </div>
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
