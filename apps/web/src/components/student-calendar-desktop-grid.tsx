"use client";

import type { MouseEvent as ReactMouseEvent } from "react";
import type {
  RevisionData,
  UpcomingTask,
} from "@/components/student-calendar-model";
import {
  buildDesktopMonthCells,
  DAYS_FULL,
  DAYS_SHORT_DESKTOP,
  dateKeyUtc,
  getWeekDates,
} from "@/components/student-calendar-model";
import { DesktopDayCell } from "./student-calendar-desktop-day-cell";

export function DesktopMonthGrid({
  curMonth,
  curYear,
  data,
  tasksByDay,
  activeKey,
  todayKey,
  onDayClick,
}: {
  curMonth: number;
  curYear: number;
  data: RevisionData;
  tasksByDay: Record<string, UpcomingTask[]>;
  activeKey: string | null;
  todayKey: string;
  onDayClick: (event: ReactMouseEvent<HTMLButtonElement>, key: string) => void;
}) {
  const cells = buildDesktopMonthCells(curYear, curMonth);
  const slots = cells.map((cell, slotIndex) => ({
    day: cell,
    slotKey: `${curYear}-${curMonth}-slot-${slotIndex}`,
  }));

  return (
    <>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {DAYS_SHORT_DESKTOP.map((day) => (
          <div
            className="py-1.5 text-center font-medium text-[11px] text-muted-foreground"
            key={day}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {slots.map((slot) => {
          if (slot.day === null) {
            return (
              <div
                aria-hidden="true"
                className="min-h-[108px] rounded-lg border border-transparent"
                key={slot.slotKey}
              />
            );
          }

          const dayKey = dateKeyUtc(
            new Date(Date.UTC(curYear, curMonth, slot.day))
          );
          return (
            <DesktopDayCell
              day={slot.day}
              dayKey={dayKey}
              isActive={activeKey === dayKey}
              isToday={dayKey === todayKey}
              items={data[dayKey] ?? []}
              key={dayKey}
              onClick={onDayClick}
              tasks={tasksByDay[dayKey] ?? []}
            />
          );
        })}
      </div>
    </>
  );
}

export function WeekGrid({
  weekStart,
  data,
  tasksByDay,
  activeKey,
  todayKey,
  onDayClick,
}: {
  weekStart: Date;
  data: RevisionData;
  tasksByDay: Record<string, UpcomingTask[]>;
  activeKey: string | null;
  todayKey: string;
  onDayClick: (event: ReactMouseEvent<HTMLButtonElement>, key: string) => void;
}) {
  const days = getWeekDates(weekStart);

  return (
    <>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {days.map((day) => (
          <div
            className="py-1.5 text-center font-medium text-[11px] text-muted-foreground"
            key={dateKeyUtc(day)}
          >
            {DAYS_FULL[day.getUTCDay()]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayKey = dateKeyUtc(day);
          return (
            <DesktopDayCell
              day={day.getUTCDate()}
              dayKey={dayKey}
              isActive={activeKey === dayKey}
              isToday={dayKey === todayKey}
              items={data[dayKey] ?? []}
              key={dayKey}
              onClick={onDayClick}
              tall
              tasks={tasksByDay[dayKey] ?? []}
            />
          );
        })}
      </div>
    </>
  );
}
