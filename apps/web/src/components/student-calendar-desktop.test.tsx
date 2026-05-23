"use client";

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  DesktopStudentCalendarSurfaceMock,
  useStudentCalendarDesktopLayoutMock,
  useStudentCalendarDesktopMock,
} = vi.hoisted(() => ({
  DesktopStudentCalendarSurfaceMock: vi.fn(() => (
    <div>DESKTOP_STUDENT_CALENDAR_SURFACE</div>
  )),
  useStudentCalendarDesktopMock: vi.fn(),
  useStudentCalendarDesktopLayoutMock: vi.fn(),
}));

vi.mock("@/components/student-calendar-desktop-surface", () => ({
  DesktopStudentCalendarSurface: DesktopStudentCalendarSurfaceMock,
}));

vi.mock("@/components/use-student-calendar-desktop", () => ({
  useStudentCalendarDesktop: useStudentCalendarDesktopMock,
}));

vi.mock("@/components/use-student-calendar-data", () => ({
  useStudentCalendarDesktopLayout: useStudentCalendarDesktopLayoutMock,
}));

vi.mock("@/components/student-calendar-mobile", () => ({
  MobileStudentCalendar: () => <div>MOBILE_STUDENT_CALENDAR</div>,
}));

import { StudentCalendar } from "@/components/student-calendar";

const removedWrapperFile = resolve(
  import.meta.dirname,
  "./student-calendar-desktop.tsx"
);
const studentCalendarSource = readFileSync(
  resolve(import.meta.dirname, "./student-calendar.tsx"),
  "utf8"
);
const studentCalendarDataHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-student-calendar-data.ts"),
  "utf8"
);
const studentCalendarDesktopHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-student-calendar-desktop.ts"),
  "utf8"
);

describe("StudentCalendar desktop branch", () => {
  it("wires the desktop calendar runtime straight into the desktop surface without the old wrapper file", () => {
    useStudentCalendarDesktopLayoutMock.mockReturnValue(true);
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

    const html = renderToStaticMarkup(<StudentCalendar />);

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
    expect(existsSync(removedWrapperFile)).toBe(false);
    expect(html).toContain("DESKTOP_STUDENT_CALENDAR_SURFACE");
  });

  it("keeps the calendar entrypoint on split layout/data hooks instead of the removed desktop wrapper", () => {
    expect(studentCalendarSource).toContain(
      "@/components/student-calendar-desktop-surface"
    );
    expect(studentCalendarSource).toContain(
      "@/components/student-calendar-mobile"
    );
    expect(studentCalendarSource).toContain(
      "@/components/use-student-calendar-data"
    );
    expect(studentCalendarSource).toContain(
      "@/components/use-student-calendar-desktop"
    );
    expect(studentCalendarSource).not.toContain("./student-calendar-desktop");

    expect(studentCalendarDataHookSource).toContain(
      "export function useStudentCalendarDesktopLayout"
    );
    expect(studentCalendarDataHookSource).toContain(
      "export function useStudentCalendarRangeData"
    );
    expect(studentCalendarDataHookSource).toContain(
      "export function useStudentCalendarUpcomingTasks"
    );

    expect(studentCalendarDesktopHookSource).toContain(
      "useStudentCalendarActivation"
    );
    expect(studentCalendarDesktopHookSource).toContain(
      "useStudentCalendarRangeData"
    );
    expect(studentCalendarDesktopHookSource).toContain(
      "useStudentCalendarUpcomingTasks"
    );
  });
});
