import { describe, expect, it } from "vitest";
import {
  buildRollingSprintPlan,
  deriveReadinessFromEvents,
  type CourseMapNodeRecord,
  type LearningEventRecord,
} from "./course-method-data";

const baseNode: Omit<CourseMapNodeRecord, "id" | "title"> = {
  courseMapId: "map-1",
  createdAt: "2026-05-28T00:00:00.000Z",
  currentVersionId: "version-1",
  difficulty: null,
  estimatedEffortMinutes: 30,
  examWeight: 0,
  groundingState: "user_verified",
  nodeType: "topic",
  parentId: null,
  prerequisiteNodeIds: [],
  sortOrder: 0,
  sourceRefs: [],
  taxonomyConcept: null,
  taxonomySubject: "Physics",
  taxonomyTopic: null,
  updatedAt: "2026-05-28T00:00:00.000Z",
  userPriority: 0,
  verificationState: "user_verified",
};

function event(
  sourceType: string,
  direction: LearningEventRecord["direction"] = "positive"
): Pick<LearningEventRecord, "direction" | "evidenceStrength" | "sourceType"> {
  return {
    direction,
    evidenceStrength: "medium",
    sourceType,
  };
}

describe("course method planning", () => {
  it("builds only a rolling two-to-three-day plan and skips ignored nodes", () => {
    const plan = buildRollingSprintPlan({
      dailyTimeBudgetMinutes: 45,
      deadline: new Date("2026-06-03T00:00:00.000Z"),
      nodes: [
        {
          ...baseNode,
          examWeight: 2,
          id: "node-a",
          title: "Low priority",
        },
        {
          ...baseNode,
          estimatedEffortMinutes: 45,
          examWeight: 8,
          id: "node-b",
          title: "High priority",
        },
        {
          ...baseNode,
          examWeight: 99,
          id: "node-c",
          title: "Ignored",
          verificationState: "ignored",
        },
      ],
      now: new Date("2026-05-28T12:00:00.000Z"),
    });

    expect(plan).toHaveLength(2);
    expect(plan.map((item) => item.courseMapNodeId)).toEqual([
      "node-b",
      "node-a",
    ]);
    expect(
      new Set(plan.map((item) => item.plannedFor.toISOString().slice(0, 10)))
    ).toEqual(new Set(["2026-05-28", "2026-05-29"]));
  });

  it("uses learning events to separate coverage, retention, assessment, and risk", () => {
    const readiness = deriveReadinessFromEvents([
      event("flashcard_review"),
      event("flashcard_review"),
      event("quiz"),
      event("misconception", "negative"),
    ]);

    expect(readiness.coverage).toBe(1);
    expect(readiness.retention).toBe(0.4);
    expect(readiness.assessment).toBeCloseTo(1 / 3);
    expect(readiness.risk).toBe(0.25);
    expect(readiness.repairLoad).toBe(0.5);
    expect(readiness.readiness).toBeGreaterThan(0);
    expect(readiness.readiness).toBeLessThan(1);
  });
});
