"use client";

import { DesktopStudentCalendar } from "@/components/student-calendar-desktop";
import { MobileStudentCalendar } from "@/components/student-calendar-mobile";
import { useStudentCalendarDesktopLayout } from "@/components/use-student-calendar-data";

export function StudentCalendar() {
  const isDesktop = useStudentCalendarDesktopLayout();
  return isDesktop ? <DesktopStudentCalendar /> : <MobileStudentCalendar />;
}
