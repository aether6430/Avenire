"use client";

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const { DesktopStudentCalendarSurfaceMock, useStudentCalendarDesktopMock } =
  vi.hoisted(() => ({
    DesktopStudentCalendarSurfaceMock: vi.fn(() => (
      <div>DESKTOP_STUDENT_CALENDAR_SURFACE</div>
    )),
    useStudentCalendarDesktopMock: vi.fn(),
  }));

vi.mock("@/components/student-calendar-desktop-surface", () => ({
  DesktopStudentCalendarSurface: DesktopStudentCalendarSurfaceMock,
}));

vi.mock("@/components/use-student-calendar-desktop", () => ({
  useStudentCalendarDesktop: useStudentCalendarDesktopMock,
}));

import { DesktopStudentCalendar } from "@/components/student-calendar-desktop";

describe("DesktopStudentCalendar", () => {
  it("wires the desktop calendar runtime into the surface", () => {
    useStudentCalendarDesktopMock.mockReturnValue({
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
      totalDue: 0,
      weekStart: new Date("2026-05-17T00:00:00Z"),
    });

    const html = renderToStaticMarkup(<DesktopStudentCalendar />);

    expect(useStudentCalendarDesktopMock).toHaveBeenCalledTimes(1);
    expect(DesktopStudentCalendarSurfaceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        runtime: expect.objectContaining({
          headerLabel: "May 2026",
          mode: "month",
          totalDue: 0,
        }),
      }),
      undefined
    );
    expect(html).toContain("DESKTOP_STUDENT_CALENDAR_SURFACE");
  });
});
