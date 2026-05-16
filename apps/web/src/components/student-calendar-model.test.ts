import { describe, expect, it } from "vitest";

import {
  buildDesktopMonthCells,
  buildMobileMonthCells,
  buildTasksByDay,
  calculateMonthDueTotal,
  calculateWeekDueTotal,
  formatRangeLabel,
  getWeekStartUtc,
  type RevisionData,
  resolveStudentCalendarPopoverPos,
  resolveStudentCalendarUpcomingTasksError,
} from "@/components/student-calendar-model";

describe("student calendar model", () => {
  it("builds padded mobile month cells across surrounding months", () => {
    const cells = buildMobileMonthCells(2026, 4);

    expect(cells).toHaveLength(42);
    expect(cells[0]).toMatchObject({
      day: 26,
      isOtherMonth: true,
      key: "2026-04-26",
    });
    expect(cells[6]).toMatchObject({
      day: 2,
      isOtherMonth: false,
      key: "2026-05-02",
    });
    expect(cells.at(-1)).toMatchObject({
      day: 6,
      isOtherMonth: true,
      key: "2026-06-06",
    });
  });

  it("builds desktop month cells with leading null padding", () => {
    const cells = buildDesktopMonthCells(2026, 4);

    expect(cells.slice(0, 6)).toEqual([null, null, null, null, null, 1]);
    expect(cells).toHaveLength(42);
  });

  it("groups due tasks by utc day key", () => {
    const grouped = buildTasksByDay([
      {
        description: null,
        dueAt: "2026-05-13T23:00:00.000Z",
        id: "task-a",
        status: "pending",
        title: "Essay",
      },
      {
        description: null,
        dueAt: "2026-05-13T08:30:00.000Z",
        id: "task-b",
        status: "in_progress",
        title: "Quiz",
      },
      {
        description: null,
        dueAt: null,
        id: "task-c",
        status: "pending",
        title: "No date",
      },
    ]);

    expect(Object.keys(grouped)).toEqual(["2026-05-13"]);
    expect(grouped["2026-05-13"]).toHaveLength(2);
  });

  it("keeps upcoming-task load errors readable", () => {
    expect(resolveStudentCalendarUpcomingTasksError(new Error("boom"))).toBe(
      "boom"
    );
    expect(resolveStudentCalendarUpcomingTasksError(null)).toBe(
      "Unable to load upcoming tasks."
    );
  });

  it("calculates month and week totals from shared revision data", () => {
    const data: RevisionData = {
      "2026-05-13": [
        { dueCount: 2, id: "a", setId: "set-a", title: "Biology" },
        { dueCount: 4, id: "b", setId: "set-b", title: "Chemistry" },
      ],
      "2026-05-15": [{ dueCount: 3, id: "c", setId: "set-c", title: "Math" }],
      "2026-06-01": [
        { dueCount: 9, id: "d", setId: "set-d", title: "Physics" },
      ],
    };

    expect(calculateMonthDueTotal(data, 2026, 4)).toBe(9);
    expect(
      calculateWeekDueTotal(
        data,
        getWeekStartUtc(new Date("2026-05-13T12:00:00Z"))
      )
    ).toBe(9);
  });

  it("formats week labels and clamps day popover position inside the calendar shell", () => {
    expect(
      formatRangeLabel("week", 2026, 4, new Date("2026-05-10T00:00:00Z"))
    ).toBe("May 10 - 16, 2026");
    expect(
      formatRangeLabel("week", 2026, 11, new Date("2026-12-27T00:00:00Z"))
    ).toBe("Dec 27, 2026 - Jan 2, 2027");

    expect(
      resolveStudentCalendarPopoverPos(
        { bottom: 240, left: 580, top: 120, width: 120 },
        { bottom: 0, left: 100, top: 40, width: 640 }
      )
    ).toEqual({
      left: 360,
      originX: "180px",
      top: 208,
    });
  });
});
