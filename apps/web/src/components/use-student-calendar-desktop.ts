"use client";

import { type MouseEvent as ReactMouseEvent, useMemo, useState } from "react";
import type {
  CalendarMode,
  StudentCalendarPopoverPos,
} from "@/components/student-calendar-model";
import {
  addUtcDays,
  buildTasksByDay,
  calculateMonthDueTotal,
  calculateWeekDueTotal,
  dateKeyUtc,
  formatRangeLabel,
  getMonthRange,
  getWeekRange,
  getWeekStartUtc,
  resolveStudentCalendarPopoverPos,
} from "@/components/student-calendar-model";
import {
  useStudentCalendarActivation,
  useStudentCalendarRangeData,
  useStudentCalendarUpcomingTasks,
} from "@/components/use-student-calendar-data";

export function useStudentCalendarDesktop() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dateKeyUtc(today), [today]);
  const { containerRef, isActive } =
    useStudentCalendarActivation<HTMLDivElement>();
  const { upcomingTasks, error: tasksError } =
    useStudentCalendarUpcomingTasks();

  const [mode, setMode] = useState<CalendarMode>("month");
  const [curYear, setCurYear] = useState(today.getUTCFullYear());
  const [curMonth, setCurMonth] = useState(today.getUTCMonth());
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStartUtc(today)
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] =
    useState<StudentCalendarPopoverPos | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

  const { from, to } = useMemo(
    () =>
      mode === "month"
        ? getMonthRange(curYear, curMonth)
        : getWeekRange(weekStart),
    [curMonth, curYear, mode, weekStart]
  );
  const { data, error, loading } = useStudentCalendarRangeData({
    active: isActive,
    fromKey: dateKeyUtc(from),
    rangeKey: `${mode}-${dateKeyUtc(from)}-${dateKeyUtc(to)}`,
    toKey: dateKeyUtc(to),
  });

  const tasksByDay = useMemo(
    () => buildTasksByDay(upcomingTasks),
    [upcomingTasks]
  );
  const headerLabel = formatRangeLabel(mode, curYear, curMonth, weekStart);
  const periodKey =
    mode === "month"
      ? `m-${curYear}-${curMonth}`
      : `w-${weekStart.toISOString().slice(0, 10)}`;
  const totalDue = useMemo(
    () =>
      mode === "month"
        ? calculateMonthDueTotal(data, curYear, curMonth)
        : calculateWeekDueTotal(data, weekStart),
    [curMonth, curYear, data, mode, weekStart]
  );
  const activeItems = activeKey ? (data[activeKey] ?? []) : [];

  const handleDayClick = (
    event: ReactMouseEvent<HTMLButtonElement>,
    key: string
  ) => {
    if (activeKey === key) {
      setActiveKey(null);
      return;
    }

    const cell = event.currentTarget.getBoundingClientRect();
    const container = containerRef.current?.getBoundingClientRect();
    if (!container) {
      return;
    }

    setPopoverPos(resolveStudentCalendarPopoverPos(cell, container));
    setActiveKey(key);
  };

  const navigate = (forward: boolean) => {
    setDir(forward ? 1 : -1);
    setActiveKey(null);

    if (mode === "month") {
      setCurMonth((prev) => {
        if (forward) {
          if (prev === 11) {
            setCurYear((year) => year + 1);
            return 0;
          }
          return prev + 1;
        }

        if (prev === 0) {
          setCurYear((year) => year - 1);
          return 11;
        }

        return prev - 1;
      });
      return;
    }

    setWeekStart((prev) => addUtcDays(prev, forward ? 7 : -7));
  };

  const goToday = () => {
    setDir(1);
    setActiveKey(null);
    setCurYear(today.getUTCFullYear());
    setCurMonth(today.getUTCMonth());
    setWeekStart(getWeekStartUtc(today));
  };

  return {
    activeItems,
    activeKey,
    containerRef,
    curMonth,
    curYear,
    data,
    dir,
    error,
    goToday,
    handleDayClick,
    headerLabel,
    loading,
    mode,
    navigate,
    periodKey,
    popoverPos,
    setActiveKey,
    setMode,
    tasksByDay,
    tasksError,
    todayKey,
    totalDue,
    weekStart,
  };
}

export type StudentCalendarDesktopRuntime = ReturnType<
  typeof useStudentCalendarDesktop
>;
