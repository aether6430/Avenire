"use client";

import { DesktopStudentCalendarSurface } from "@/components/student-calendar-desktop-surface";
import { MobileStudentCalendar } from "@/components/student-calendar-mobile";
import { useStudentCalendarDesktopLayout } from "@/components/use-student-calendar-data";
import { useStudentCalendarDesktop } from "@/components/use-student-calendar-desktop";

export function StudentCalendar() {
  const isDesktop = useStudentCalendarDesktopLayout();
  const desktopRuntime = useStudentCalendarDesktop();

  return isDesktop ? (
    <DesktopStudentCalendarSurface runtime={desktopRuntime} />
  ) : (
    <MobileStudentCalendar />
  );
}
