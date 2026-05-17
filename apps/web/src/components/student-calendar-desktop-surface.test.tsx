"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DesktopStudentCalendarSurface } from "@/components/student-calendar-desktop-surface";

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
});
