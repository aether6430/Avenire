import { describe, expect, it } from "vitest";
import {
  createQuickCaptureMisconceptionState,
  createQuickCaptureTaskState,
  createQuickCaptureTaskStateFromValues,
  getQuickCaptureDialogCopy,
  getQuickCaptureSubmitLabel,
  isQuickCaptureSubmitDisabled,
  toDateTimeLocalValue,
  toIsoFromDateTimeLocalValue,
} from "@/components/dashboard/quick-capture-model";

describe("quick capture model", () => {
  it("normalizes task state and date conversions for task edit hydration", () => {
    expect(toDateTimeLocalValue("2026-05-13")).toBe("2026-05-13T23:59");
    expect(toDateTimeLocalValue("2026-05-13T09:30:00.000Z")).toContain(
      "2026-05-13T"
    );
    expect(toIsoFromDateTimeLocalValue("")).toBeNull();
    expect(toIsoFromDateTimeLocalValue("2026-05-13T23:59")).toContain(
      "2026-05-13"
    );

    const task = createQuickCaptureTaskStateFromValues({
      currentUserId: "user-1",
      taskValues: {
        assigneeUserId: undefined,
        description: "Review notes",
        dueAt: "2026-05-13",
        priority: "high",
        title: "Task",
      },
    });

    expect(task.assigneeUserId).toBe("user-1");
    expect(task.priority).toBe("high");
    expect(task.dueAt).toBe("2026-05-13T23:59");
    expect(task.resources).toEqual([]);
  });

  it("derives dialog copy, button labels, and disabled state from kind and content", () => {
    expect(
      getQuickCaptureDialogCopy({
        isTaskEdit: false,
        kind: "task",
      }).title
    ).toBe("Capture task");
    expect(
      getQuickCaptureDialogCopy({
        isTaskEdit: true,
        kind: "task",
      }).title
    ).toBe("Edit task");
    expect(
      getQuickCaptureDialogCopy({
        isTaskEdit: false,
        kind: "misconception",
      }).description
    ).toContain("mastery");

    expect(
      getQuickCaptureSubmitLabel({
        busyKind: null,
        isTaskEdit: true,
        kind: "task",
      })
    ).toBe("Save task");
    expect(
      getQuickCaptureSubmitLabel({
        busyKind: "note",
        isTaskEdit: false,
        kind: "note",
      })
    ).toBe("Saving");

    expect(
      isQuickCaptureSubmitDisabled({
        busyKind: null,
        kind: "task",
        misconception: createQuickCaptureMisconceptionState(),
        note: {
          content: "",
          title: "",
        },
        task: createQuickCaptureTaskState("user-1"),
      })
    ).toBe(true);

    expect(
      isQuickCaptureSubmitDisabled({
        busyKind: null,
        kind: "misconception",
        misconception: {
          concept: "Entropy",
          confidence: "0.8",
          reason: "Mixes it with enthalpy",
          subject: "Chemistry",
          topic: "Thermodynamics",
        },
        note: {
          content: "",
          title: "",
        },
        task: createQuickCaptureTaskState("user-1"),
      })
    ).toBe(false);
  });
});
