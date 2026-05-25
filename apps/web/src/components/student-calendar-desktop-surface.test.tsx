"use client";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesktopStudentCalendarSurface } from "@/components/student-calendar";

const studentCalendarDesktopSurfaceSource = readFileSync(
  resolve(import.meta.dirname, "./student-calendar.tsx"),
  "utf8"
);
const studentCalendarSharedSource = readFileSync(
  resolve(import.meta.dirname, "./student-calendar-shared.tsx"),
  "utf8"
);
const studentCalendarDesktopGridSource = readFileSync(
  resolve(import.meta.dirname, "./student-calendar-desktop-grid.tsx"),
  "utf8"
);

describe("DesktopStudentCalendarSurface", () => {
  it("renders the current calendar header and due summary", () => {
    const html = renderToStaticMarkup(
      <DesktopStudentCalendarSurface
        runtime={{
          activeItems: [],
          activeKey: null,
          containerRef: { current: null },
          curMonth: 4,
          curYear: 2026,
          data: {},
          dir: 1,
          error: null,
          goToday: () => {},
          handleDayClick: () => {},
          headerLabel: "May 2026",
          loading: false,
          mode: "month",
          navigate: () => {},
          periodKey: "m-2026-4",
          popoverPos: null,
          setActiveKey: () => {},
          setMode: () => {},
          tasksByDay: {},
          tasksError: null,
          todayKey: "2026-05-17",
          totalDue: 4,
          weekStart: new Date("2026-05-17T00:00:00Z"),
        }}
      />
    );

    expect(html).toContain("May 2026");
    expect(html).toContain("cards due");
    expect(html).toContain(">4<");
    expect(html).toContain("Today");
    expect(html).toContain("Month");
    expect(html).toContain("Week");
  });

  it("renders explicit revision and upcoming-task error copy from the runtime", () => {
    const html = renderToStaticMarkup(
      <DesktopStudentCalendarSurface
        runtime={{
          activeItems: [],
          activeKey: null,
          containerRef: { current: null },
          curMonth: 4,
          curYear: 2026,
          data: {},
          dir: 1,
          error: "calendar backend offline",
          goToday: () => {},
          handleDayClick: () => {},
          headerLabel: "May 2026",
          loading: false,
          mode: "month",
          navigate: () => {},
          periodKey: "m-2026-4",
          popoverPos: null,
          setActiveKey: () => {},
          setMode: () => {},
          tasksByDay: {},
          tasksError: "tasks backend offline",
          todayKey: "2026-05-17",
          totalDue: 4,
          weekStart: new Date("2026-05-17T00:00:00Z"),
        }}
      />
    );

    expect(html).toContain("calendar backend offline");
    expect(html).toContain("tasks backend offline");
  });

  it("keeps the desktop surface on presentational grid/popover owners instead of inlining shared day-sheet logic or data hooks", () => {
    expect(studentCalendarDesktopSurfaceSource).toContain(
      "./student-calendar-desktop-day-popover"
    );
    expect(studentCalendarDesktopSurfaceSource).toContain(
      "./student-calendar-desktop-grid"
    );
    expect(studentCalendarDesktopSurfaceSource).not.toContain(
      "useStudentCalendarRangeData("
    );
    expect(studentCalendarDesktopSurfaceSource).not.toContain(
      "useStudentCalendarUpcomingTasks("
    );
    expect(studentCalendarDesktopSurfaceSource).not.toContain(
      "StudentCalendarDaySheet"
    );

    expect(studentCalendarSharedSource).toContain(
      "export function StudentCalendarDayPills"
    );
    expect(studentCalendarSharedSource).toContain(
      "export function StudentCalendarDaySheet"
    );
    expect(studentCalendarDesktopGridSource).toContain("DesktopDayCell");
    expect(studentCalendarDesktopGridSource).not.toContain(
      "useStudentCalendarRangeData("
    );
  });
});
