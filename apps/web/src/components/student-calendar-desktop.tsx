"use client";

import { DesktopStudentCalendarSurface } from "@/components/student-calendar-desktop-surface";
import { useStudentCalendarDesktop } from "@/components/use-student-calendar-desktop";

export function DesktopStudentCalendar() {
  const runtime = useStudentCalendarDesktop();

  return <DesktopStudentCalendarSurface runtime={runtime} />;
}
