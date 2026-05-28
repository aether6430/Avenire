import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { db } from "./client";
import {
  courseMap,
  courseMapNode,
  courseMapPatch,
  courseMapVersion,
  courseMethod,
  learningEvent,
  method,
  sprintPlanItem,
  studySprint,
} from "./schema";
import { createTaskForUser } from "./task-data";

export type MethodType = "chat" | "course";
export type MethodStatus = "active" | "archived";
export type CourseMapStatus = "draft" | "accepted" | "archived";
export type CourseMapNodeType =
  | "module"
  | "topic"
  | "subtopic"
  | "skill"
  | "exam_section";
export type CourseMapNodeReviewState =
  | "ai_suggested"
  | "needs_review"
  | "user_verified"
  | "user_added"
  | "ignored";
export type StudySprintStatus = "active" | "completed" | "cancelled";
export type SprintPlanItemType =
  | "learn"
  | "practice"
  | "review"
  | "quiz"
  | "repair";
export type SprintPlanItemStatus =
  | "proposed"
  | "accepted"
  | "committed_to_task"
  | "skipped"
  | "superseded"
  | "completed_inline"
  | "completed_via_task";
export type LearningEventDirection = "positive" | "negative" | "neutral";
export type LearningEventStrength = "weak" | "medium" | "strong";
export type ReadinessPreset =
  | "balanced"
  | "exam_sprint"
  | "mastery"
  | "weakness_repair";

export interface CourseSourceRef extends Record<string, unknown> {
  id?: string;
  label?: string;
  type: "file" | "folder" | "chat" | "note" | "manual" | "url";
}

export interface CourseMapNodeInput {
  difficulty?: number | null;
  estimatedEffortMinutes?: number | null;
  examWeight?: number;
  groundingState?: CourseMapNodeReviewState;
  id?: string;
  nodeType?: CourseMapNodeType;
  parentId?: string | null;
  prerequisiteNodeIds?: string[];
  sortOrder?: number;
  sourceRefs?: CourseSourceRef[];
  taxonomyConcept?: string | null;
  taxonomySubject?: string | null;
  taxonomyTopic?: string | null;
  title: string;
  userPriority?: number;
  verificationState?: CourseMapNodeReviewState;
}

export interface CourseMapNodeRecord extends CourseMapNodeInput {
  courseMapId: string;
  createdAt: string;
  currentVersionId: string;
  difficulty: number | null;
  estimatedEffortMinutes: number | null;
  examWeight: number;
  groundingState: CourseMapNodeReviewState;
  id: string;
  nodeType: CourseMapNodeType;
  parentId: string | null;
  prerequisiteNodeIds: string[];
  sortOrder: number;
  sourceRefs: CourseSourceRef[];
  taxonomyConcept: string | null;
  taxonomySubject: string | null;
  taxonomyTopic: string | null;
  updatedAt: string;
  userPriority: number;
  verificationState: CourseMapNodeReviewState;
}

export interface SprintPlanItemDraft {
  courseMapNodeId: string;
  estimatedMinutes: number;
  itemType: SprintPlanItemType;
  plannedFor: Date;
  rationale: string;
  sourceRefs: CourseSourceRef[];
  status: SprintPlanItemStatus;
}

export interface SprintPlanItemRecord extends SprintPlanItemDraft {
  createdAt: string;
  id: string;
  linkedTaskId: string | null;
  sprintId: string;
  updatedAt: string;
}

export interface LearningEventRecord {
  courseMapId: string;
  courseMapNodeId: string;
  courseMapVersionId: string;
  courseMethodId: string;
  createdAt: string;
  direction: LearningEventDirection;
  evidenceStrength: LearningEventStrength;
  id: string;
  observedAt: string;
  payload: Record<string, unknown>;
  sourceId: string | null;
  sourceTable: string | null;
  sourceType: string;
  sprintId: string | null;
  userId: string;
  workspaceId: string;
}

export interface ReadinessBreakdown {
  assessment: number;
  coverage: number;
  readiness: number;
  repairLoad: number;
  retention: number;
  risk: number;
}

interface ReadinessWeights {
  assessment: number;
  coverage: number;
  repairLoad: number;
  retention: number;
  risk: number;
}

const READINESS_PRESETS: Record<ReadinessPreset, ReadinessWeights> = {
  balanced: {
    assessment: 0.3,
    coverage: 0.3,
    repairLoad: 0.1,
    retention: 0.25,
    risk: 0.2,
  },
  exam_sprint: {
    assessment: 0.4,
    coverage: 0.25,
    repairLoad: 0.1,
    retention: 0.2,
    risk: 0.25,
  },
  mastery: {
    assessment: 0.35,
    coverage: 0.2,
    repairLoad: 0.1,
    retention: 0.35,
    risk: 0.2,
  },
  weakness_repair: {
    assessment: 0.25,
    coverage: 0.2,
    repairLoad: 0.25,
    retention: 0.2,
    risk: 0.35,
  },
};

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function normalizeCourseSourceRefs(value: unknown): CourseSourceRef[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((entry): entry is CourseSourceRef => {
    if (!(entry && typeof entry === "object" && !Array.isArray(entry))) {
      return false;
    }
    const record = entry as Record<string, unknown>;
    return (
      record.type === "file" ||
      record.type === "folder" ||
      record.type === "chat" ||
      record.type === "note" ||
      record.type === "manual" ||
      record.type === "url"
    );
  });
}

function mapNode(row: typeof courseMapNode.$inferSelect): CourseMapNodeRecord {
  return {
    courseMapId: row.courseMapId,
    createdAt: row.createdAt.toISOString(),
    currentVersionId: row.currentVersionId,
    difficulty: row.difficulty ?? null,
    estimatedEffortMinutes: row.estimatedEffortMinutes ?? null,
    examWeight: row.examWeight,
    groundingState: row.groundingState as CourseMapNodeReviewState,
    id: row.id,
    nodeType: row.nodeType as CourseMapNodeType,
    parentId: row.parentId,
    prerequisiteNodeIds: row.prerequisiteNodeIds,
    sortOrder: row.sortOrder,
    sourceRefs: normalizeCourseSourceRefs(row.sourceRefs),
    taxonomyConcept: row.taxonomyConcept,
    taxonomySubject: row.taxonomySubject,
    taxonomyTopic: row.taxonomyTopic,
    title: row.title,
    updatedAt: row.updatedAt.toISOString(),
    userPriority: row.userPriority,
    verificationState: row.verificationState as CourseMapNodeReviewState,
  };
}

function mapPlanItem(
  row: typeof sprintPlanItem.$inferSelect
): SprintPlanItemRecord {
  return {
    courseMapNodeId: row.courseMapNodeId,
    createdAt: row.createdAt.toISOString(),
    estimatedMinutes: row.estimatedMinutes,
    id: row.id,
    itemType: row.itemType as SprintPlanItemType,
    linkedTaskId: row.linkedTaskId,
    plannedFor: row.plannedFor,
    rationale: row.rationale,
    sourceRefs: normalizeCourseSourceRefs(row.sourceRefs),
    sprintId: row.sprintId,
    status: row.status as SprintPlanItemStatus,
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildPlanItemSelection() {
  return {
    courseMapNodeId: sprintPlanItem.courseMapNodeId,
    createdAt: sprintPlanItem.createdAt,
    estimatedMinutes: sprintPlanItem.estimatedMinutes,
    id: sprintPlanItem.id,
    itemType: sprintPlanItem.itemType,
    linkedTaskId: sprintPlanItem.linkedTaskId,
    plannedFor: sprintPlanItem.plannedFor,
    rationale: sprintPlanItem.rationale,
    sourceRefs: sprintPlanItem.sourceRefs,
    sprintId: sprintPlanItem.sprintId,
    status: sprintPlanItem.status,
    updatedAt: sprintPlanItem.updatedAt,
  };
}

function mapLearningEvent(
  row: typeof learningEvent.$inferSelect
): LearningEventRecord {
  return {
    courseMapId: row.courseMapId,
    courseMapNodeId: row.courseMapNodeId,
    courseMapVersionId: row.courseMapVersionId,
    courseMethodId: row.courseMethodId,
    createdAt: row.createdAt.toISOString(),
    direction: row.direction as LearningEventDirection,
    evidenceStrength: row.evidenceStrength as LearningEventStrength,
    id: row.id,
    observedAt: row.observedAt.toISOString(),
    payload: row.payload,
    sourceId: row.sourceId,
    sourceTable: row.sourceTable,
    sourceType: row.sourceType,
    sprintId: row.sprintId,
    userId: row.userId,
    workspaceId: row.workspaceId,
  };
}

export function buildRollingSprintPlan(input: {
  dailyTimeBudgetMinutes: number;
  deadline: Date;
  nodes: Array<
    Pick<
      CourseMapNodeRecord,
      | "estimatedEffortMinutes"
      | "examWeight"
      | "id"
      | "sourceRefs"
      | "title"
      | "userPriority"
      | "verificationState"
    >
  >;
  now?: Date;
}): SprintPlanItemDraft[] {
  const now = input.now ?? new Date();
  const daysRemaining = Math.max(
    1,
    Math.ceil((input.deadline.getTime() - now.getTime()) / 86_400_000)
  );
  const plannedDays = Math.min(3, daysRemaining);
  const candidates = input.nodes
    .filter((node) => node.verificationState !== "ignored")
    .sort((left, right) => {
      const rightScore = right.examWeight + right.userPriority;
      const leftScore = left.examWeight + left.userPriority;
      return rightScore - leftScore || left.title.localeCompare(right.title);
    });

  const drafts: SprintPlanItemDraft[] = [];
  const dailyUsed = new Map<number, number>();

  for (const node of candidates) {
    const estimatedMinutes = Math.max(15, node.estimatedEffortMinutes ?? 30);
    const itemType: SprintPlanItemType =
      node.verificationState === "needs_review" ? "learn" : "practice";

    for (let dayIndex = 0; dayIndex < plannedDays; dayIndex += 1) {
      const used = dailyUsed.get(dayIndex) ?? 0;
      if (used + estimatedMinutes > input.dailyTimeBudgetMinutes) {
        continue;
      }

      const plannedFor = new Date(now);
      plannedFor.setUTCDate(now.getUTCDate() + dayIndex);
      plannedFor.setUTCHours(9, 0, 0, 0);
      dailyUsed.set(dayIndex, used + estimatedMinutes);
      drafts.push({
        courseMapNodeId: node.id,
        estimatedMinutes,
        itemType,
        plannedFor,
        rationale:
          node.verificationState === "needs_review"
            ? "Review and ground this node before deeper practice."
            : "Prioritized by exam weight, user priority, and sprint deadline.",
        sourceRefs: node.sourceRefs,
        status: "proposed",
      });
      break;
    }
  }

  return drafts;
}

export function deriveReadinessFromEvents(
  events: Array<
    Pick<LearningEventRecord, "direction" | "evidenceStrength" | "sourceType">
  >,
  preset: ReadinessPreset = "balanced"
): ReadinessBreakdown {
  const weights = READINESS_PRESETS[preset];
  const positive = events.filter((event) => event.direction === "positive");
  const negative = events.filter((event) => event.direction === "negative");
  const touched = events.length > 0 ? 1 : 0;
  const assessment = clampScore(
    positive.filter(
      (event) =>
        event.sourceType === "quiz" || event.sourceType === "assessment"
    ).length / 3
  );
  const retention = clampScore(
    positive.filter((event) => event.sourceType === "flashcard_review").length /
      5
  );
  const repairLoad = clampScore(
    negative.filter((event) => event.sourceType === "misconception").length / 2
  );
  const risk = clampScore(negative.length / Math.max(1, events.length));

  const readiness = clampScore(
    touched * weights.coverage +
      assessment * weights.assessment +
      retention * weights.retention -
      risk * weights.risk -
      repairLoad * weights.repairLoad
  );

  return {
    assessment,
    coverage: touched,
    readiness,
    repairLoad,
    retention,
    risk,
  };
}

export async function createCourseMethod(input: {
  nodes: CourseMapNodeInput[];
  settings?: Record<string, unknown>;
  sourceRefs?: CourseSourceRef[];
  subject?: string | null;
  title: string;
  userId: string;
  workspaceId: string;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const [createdMethod] = await tx
      .insert(method)
      .values({
        createdAt: now,
        id: randomUUID(),
        status: "active",
        title: input.title,
        type: "course",
        updatedAt: now,
        userId: input.userId,
        workspaceId: input.workspaceId,
      })
      .returning();

    const [createdMap] = await tx
      .insert(courseMap)
      .values({
        createdAt: now,
        id: randomUUID(),
        methodId: createdMethod.id,
        status: "draft",
        subject: input.subject ?? null,
        title: input.title,
        updatedAt: now,
        userId: input.userId,
        workspaceId: input.workspaceId,
      })
      .returning();

    const [createdVersion] = await tx
      .insert(courseMapVersion)
      .values({
        courseMapId: createdMap.id,
        createdAt: now,
        createdBy: input.userId,
        id: randomUUID(),
        snapshot: {
          nodeCount: input.nodes.length,
          title: input.title,
        },
        versionNumber: 1,
      })
      .returning();

    await tx.insert(courseMethod).values({
      activeCourseMapId: createdMap.id,
      currentVersionId: createdVersion.id,
      methodId: createdMethod.id,
      settings: input.settings ?? {},
      sourceRefs: input.sourceRefs ?? [],
    });

    const nodeRows =
      input.nodes.length > 0
        ? await tx
            .insert(courseMapNode)
            .values(
              input.nodes.map((node, index) => ({
                courseMapId: createdMap.id,
                createdAt: now,
                currentVersionId: createdVersion.id,
                difficulty: node.difficulty ?? null,
                estimatedEffortMinutes: node.estimatedEffortMinutes ?? null,
                examWeight: node.examWeight ?? 0,
                groundingState: node.groundingState ?? "ai_suggested",
                id: node.id ?? randomUUID(),
                nodeType: node.nodeType ?? "topic",
                parentId: node.parentId ?? null,
                prerequisiteNodeIds: node.prerequisiteNodeIds ?? [],
                sortOrder: node.sortOrder ?? index,
                sourceRefs: node.sourceRefs ?? [],
                taxonomyConcept: node.taxonomyConcept ?? null,
                taxonomySubject: node.taxonomySubject ?? input.subject ?? null,
                taxonomyTopic: node.taxonomyTopic ?? null,
                title: node.title,
                updatedAt: now,
                userPriority: node.userPriority ?? 0,
                verificationState: node.verificationState ?? "needs_review",
              }))
            )
            .returning()
        : [];

    return {
      courseMap: createdMap,
      method: createdMethod,
      nodes: nodeRows.map(mapNode),
      version: createdVersion,
    };
  });
}

export async function listCourseMethodsForUser(input: {
  userId: string;
  workspaceId: string;
}) {
  return db
    .select({
      activeCourseMapId: courseMethod.activeCourseMapId,
      currentVersionId: courseMethod.currentVersionId,
      id: method.id,
      status: method.status,
      title: method.title,
      updatedAt: method.updatedAt,
    })
    .from(method)
    .innerJoin(courseMethod, eq(courseMethod.methodId, method.id))
    .where(
      and(
        eq(method.workspaceId, input.workspaceId),
        eq(method.userId, input.userId),
        eq(method.type, "course")
      )
    )
    .orderBy(desc(method.updatedAt));
}

export async function startStudySprint(input: {
  courseMapId: string;
  courseMapVersionId: string;
  dailyTimeBudgetMinutes: number;
  deadline: Date;
  targetReadiness: number;
  title: string;
  userId: string;
  workspaceId: string;
}) {
  const now = new Date();
  return db.transaction(async (tx) => {
    const active = await tx
      .select({ id: studySprint.id })
      .from(studySprint)
      .where(
        and(
          eq(studySprint.courseMapId, input.courseMapId),
          eq(studySprint.status, "active")
        )
      )
      .limit(1);

    if (active[0]) {
      throw new Error("A course can only have one active sprint.");
    }

    const nodes = await tx
      .select()
      .from(courseMapNode)
      .where(
        and(
          eq(courseMapNode.courseMapId, input.courseMapId),
          eq(courseMapNode.currentVersionId, input.courseMapVersionId)
        )
      )
      .orderBy(asc(courseMapNode.sortOrder));

    const [sprint] = await tx
      .insert(studySprint)
      .values({
        courseMapId: input.courseMapId,
        courseMapVersionId: input.courseMapVersionId,
        createdAt: now,
        dailyTimeBudgetMinutes: input.dailyTimeBudgetMinutes,
        deadline: input.deadline,
        id: randomUUID(),
        startedAt: now,
        status: "active",
        targetReadiness: clampScore(input.targetReadiness),
        title: input.title,
        updatedAt: now,
        userId: input.userId,
        workspaceId: input.workspaceId,
      })
      .returning();

    const drafts = buildRollingSprintPlan({
      dailyTimeBudgetMinutes: input.dailyTimeBudgetMinutes,
      deadline: input.deadline,
      nodes: nodes.map(mapNode),
      now,
    });

    const planItems =
      drafts.length > 0
        ? await tx
            .insert(sprintPlanItem)
            .values(
              drafts.map((draft) => ({
                ...draft,
                createdAt: now,
                id: randomUUID(),
                sprintId: sprint.id,
                updatedAt: now,
              }))
            )
            .returning()
        : [];

    return {
      planItems: planItems.map(mapPlanItem),
      sprint,
    };
  });
}

export async function commitSprintPlanItemToTask(input: {
  planItemId: string;
  userId: string;
  workspaceId: string;
}) {
  const [planItem] = await db
    .select({
      estimatedMinutes: sprintPlanItem.estimatedMinutes,
      id: sprintPlanItem.id,
      linkedTaskId: sprintPlanItem.linkedTaskId,
      nodeTitle: courseMapNode.title,
      plannedFor: sprintPlanItem.plannedFor,
      rationale: sprintPlanItem.rationale,
      sprintTitle: studySprint.title,
      status: sprintPlanItem.status,
    })
    .from(sprintPlanItem)
    .innerJoin(studySprint, eq(studySprint.id, sprintPlanItem.sprintId))
    .innerJoin(
      courseMapNode,
      eq(courseMapNode.id, sprintPlanItem.courseMapNodeId)
    )
    .where(
      and(
        eq(sprintPlanItem.id, input.planItemId),
        eq(studySprint.workspaceId, input.workspaceId),
        eq(studySprint.userId, input.userId)
      )
    )
    .limit(1);

  if (!planItem) {
    return null;
  }

  if (planItem.linkedTaskId) {
    throw new Error("Plan item is already committed to a task.");
  }

  const task = await createTaskForUser(input.userId, input.workspaceId, {
    description: `${planItem.rationale}\n\nEstimated time: ${planItem.estimatedMinutes} minutes.`,
    dueAt: planItem.plannedFor,
    priority: "normal",
    resources: [],
    status: "planned",
    title: `${planItem.nodeTitle}: ${planItem.sprintTitle}`,
  });

  await db
    .update(sprintPlanItem)
    .set({
      linkedTaskId: task.id,
      status: "committed_to_task",
      updatedAt: new Date(),
    })
    .where(eq(sprintPlanItem.id, input.planItemId));

  return task;
}

export async function recordCourseLearningEvent(input: {
  courseMapId: string;
  courseMapNodeId: string;
  courseMapVersionId: string;
  courseMethodId: string;
  direction: LearningEventDirection;
  evidenceStrength: LearningEventStrength;
  observedAt?: Date;
  payload?: Record<string, unknown>;
  sourceId?: string | null;
  sourceTable?: string | null;
  sourceType: string;
  sprintId?: string | null;
  userId: string;
  workspaceId: string;
}) {
  const [row] = await db
    .insert(learningEvent)
    .values({
      courseMapId: input.courseMapId,
      courseMapNodeId: input.courseMapNodeId,
      courseMapVersionId: input.courseMapVersionId,
      courseMethodId: input.courseMethodId,
      direction: input.direction,
      evidenceStrength: input.evidenceStrength,
      id: randomUUID(),
      observedAt: input.observedAt ?? new Date(),
      payload: input.payload ?? {},
      sourceId: input.sourceId ?? null,
      sourceTable: input.sourceTable ?? null,
      sourceType: input.sourceType,
      sprintId: input.sprintId ?? null,
      userId: input.userId,
      workspaceId: input.workspaceId,
    })
    .returning();

  return mapLearningEvent(row);
}

export async function getCourseMethodOverview(input: {
  methodId: string;
  preset?: ReadinessPreset;
  userId: string;
  workspaceId: string;
}) {
  const [record] = await db
    .select({
      courseMapId: courseMethod.activeCourseMapId,
      currentVersionId: courseMethod.currentVersionId,
      methodId: method.id,
      title: method.title,
    })
    .from(method)
    .innerJoin(courseMethod, eq(courseMethod.methodId, method.id))
    .where(
      and(
        eq(method.id, input.methodId),
        eq(method.workspaceId, input.workspaceId),
        eq(method.userId, input.userId),
        eq(method.type, "course")
      )
    )
    .limit(1);

  if (!record.courseMapId || !record.currentVersionId) {
    return null;
  }

  const [nodes, activeSprint, pendingPatches] = await Promise.all([
    db
      .select()
      .from(courseMapNode)
      .where(eq(courseMapNode.courseMapId, record.courseMapId))
      .orderBy(asc(courseMapNode.sortOrder)),
    db
      .select()
      .from(studySprint)
      .where(
        and(
          eq(studySprint.courseMapId, record.courseMapId),
          eq(studySprint.status, "active")
        )
      )
      .limit(1),
    db
      .select()
      .from(courseMapPatch)
      .where(
        and(
          eq(courseMapPatch.courseMapId, record.courseMapId),
          eq(courseMapPatch.status, "pending")
        )
      )
      .orderBy(desc(courseMapPatch.createdAt)),
  ]);

  const nodeIds = nodes.map((node) => node.id);
  const events =
    nodeIds.length === 0
      ? []
      : await db
          .select()
          .from(learningEvent)
          .where(
            and(
              eq(learningEvent.courseMethodId, input.methodId),
              inArray(learningEvent.courseMapNodeId, nodeIds)
            )
          )
          .orderBy(desc(learningEvent.observedAt));

  const eventsByNode = new Map<string, LearningEventRecord[]>();
  for (const event of events.map(mapLearningEvent)) {
    const existing = eventsByNode.get(event.courseMapNodeId) ?? [];
    existing.push(event);
    eventsByNode.set(event.courseMapNodeId, existing);
  }

  return {
    activeSprint: activeSprint[0] ?? null,
    method: record,
    nodes: nodes.map((node) => ({
      ...mapNode(node),
      readiness: deriveReadinessFromEvents(
        eventsByNode.get(node.id) ?? [],
        input.preset ?? "balanced"
      ),
    })),
    pendingPatches,
  };
}

export async function listSprintPlanItems(input: {
  sprintId: string;
  userId: string;
  workspaceId: string;
}) {
  const rows = await db
    .select(buildPlanItemSelection())
    .from(sprintPlanItem)
    .innerJoin(studySprint, eq(studySprint.id, sprintPlanItem.sprintId))
    .where(
      and(
        eq(sprintPlanItem.sprintId, input.sprintId),
        eq(studySprint.workspaceId, input.workspaceId),
        eq(studySprint.userId, input.userId),
        or(
          isNull(sprintPlanItem.linkedTaskId),
          eq(sprintPlanItem.status, "committed_to_task")
        )
      )
    )
    .orderBy(asc(sprintPlanItem.plannedFor), asc(sprintPlanItem.createdAt));

  return rows.map(mapPlanItem);
}
