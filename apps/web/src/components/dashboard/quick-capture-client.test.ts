import { afterEach, describe, expect, it, vi } from "vitest";
import {
  submitQuickCaptureMisconception,
  submitQuickCaptureNote,
  submitQuickCaptureTask,
} from "@/components/dashboard/quick-capture-client";

describe("quick capture client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("submits task create and task edit flows through their dedicated endpoints", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitQuickCaptureTask({
      currentUserId: "user-1",
      task: {
        assigneeUserId: "",
        description: "Review notes",
        dueAt: "2026-05-13T23:59",
        priority: "high",
        resources: [],
        selectedAssignee: null,
        title: "Study mechanics",
      },
      taskMode: "create",
    });

    await submitQuickCaptureTask({
      currentUserId: "user-1",
      task: {
        assigneeUserId: "user-2",
        description: "Refine wording",
        dueAt: "",
        priority: "normal",
        resources: [],
        selectedAssignee: null,
        title: "Polish task",
      },
      taskId: "task-1",
      taskMode: "edit",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/capture",
      expect.objectContaining({
        body: expect.stringContaining('"kind":"task"'),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/tasks/task-1",
      expect.objectContaining({
        method: "PATCH",
      })
    );
  });

  it("submits note and misconception capture through the shared capture route", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }));

    await submitQuickCaptureNote({
      content: "A useful excerpt",
      title: "Lecture notes",
    });

    await submitQuickCaptureMisconception({
      concept: "Entropy",
      confidence: "0.85",
      reason: "Keeps mixing it with enthalpy",
      subject: "Chemistry",
      topic: "Thermodynamics",
    });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/capture",
      expect.objectContaining({
        body: JSON.stringify({
          content: "A useful excerpt",
          kind: "note",
          title: "Lecture notes",
        }),
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/capture",
      expect.objectContaining({
        body: JSON.stringify({
          confidence: "0.85",
          concept: "Entropy",
          kind: "misconception",
          reason: "Keeps mixing it with enthalpy",
          subject: "Chemistry",
          topic: "Thermodynamics",
        }),
        method: "POST",
      })
    );
  });

  it("fails closed with route-provided errors for task and note capture failures", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Task failed." }), {
          status: 400,
        })
      )
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(
      submitQuickCaptureTask({
        currentUserId: "user-1",
        task: {
          assigneeUserId: "",
          description: "",
          dueAt: "",
          priority: "normal",
          resources: [],
          selectedAssignee: null,
          title: "Broken task",
        },
        taskMode: "create",
      })
    ).rejects.toThrow("Task failed.");

    await expect(
      submitQuickCaptureNote({
        content: "body",
        title: "Broken note",
      })
    ).rejects.toThrow("Unable to capture item.");

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/capture",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/capture",
      expect.objectContaining({
        method: "POST",
      })
    );
  });

  it("fails closed with route-provided errors for misconception capture failures", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Misconception failed." }), {
        status: 422,
      })
    );

    await expect(
      submitQuickCaptureMisconception({
        concept: "Entropy",
        confidence: "0.85",
        reason: "Confused with enthalpy",
        subject: "Chemistry",
        topic: "Thermodynamics",
      })
    ).rejects.toThrow("Misconception failed.");
  });
});
