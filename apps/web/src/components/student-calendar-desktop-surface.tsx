"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  CalendarDots as CalendarDays,
  Calendar as CalendarRange,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import type { StudentCalendarDesktopRuntime } from "@/components/use-student-calendar-desktop";
import { DayPopover } from "./student-calendar-desktop-day-popover";
import { DesktopMonthGrid, WeekGrid } from "./student-calendar-desktop-grid";

export function DesktopStudentCalendarSurface({
  runtime,
}: {
  runtime: StudentCalendarDesktopRuntime;
}) {
  return (
    <div className="relative w-full space-y-3" ref={runtime.containerRef}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <AnimatePresence initial={false} mode="wait">
            <motion.h2
              animate={{
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 300, damping: 28 },
              }}
              className="font-medium text-foreground text-sm tracking-tight"
              exit={{ opacity: 0, y: 5, transition: { duration: 0.12 } }}
              initial={{ opacity: 0, y: -5 }}
              key={runtime.headerLabel}
            >
              {runtime.headerLabel}
            </motion.h2>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge
            className="font-normal text-muted-foreground text-xs"
            variant="outline"
          >
            <span className="mr-1 font-semibold text-foreground">
              {runtime.totalDue}
            </span>
            cards due
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Previous period"
          className="h-7 w-7"
          onClick={() => runtime.navigate(false)}
          size="icon"
          variant="outline"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label="Next period"
          className="h-7 w-7"
          onClick={() => runtime.navigate(true)}
          size="icon"
          variant="outline"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          className="h-7 px-2.5 text-xs"
          onClick={runtime.goToday}
          size="sm"
          variant="outline"
        >
          Today
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {(["month", "week"] as const).map((nextMode) => (
            <button
              className={cn(
                "flex h-6 items-center gap-1.5 rounded-md px-2.5 font-medium text-xs transition-colors",
                runtime.mode === nextMode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={nextMode}
              onClick={() => {
                runtime.setMode(nextMode);
                runtime.setActiveKey(null);
              }}
              type="button"
            >
              {nextMode === "month" ? (
                <CalendarDays className="h-3 w-3" />
              ) : (
                <CalendarRange className="h-3 w-3" />
              )}
              {nextMode.charAt(0).toUpperCase() + nextMode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div className="min-w-0 space-y-3">
          {runtime.loading && (
            <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
              <Spinner className="size-3.5" />
              Loading upcoming reviews...
            </div>
          )}

          {runtime.error && (
            <div className="text-muted-foreground text-xs">{runtime.error}</div>
          )}
          {runtime.tasksError && (
            <div className="text-muted-foreground text-xs">
              {runtime.tasksError}
            </div>
          )}

          <div className="overflow-hidden">
            <AnimatePresence custom={runtime.dir} initial={false} mode="wait">
              <motion.div
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: {
                    damping: 28,
                    mass: 0.85,
                    stiffness: 280,
                    type: "spring",
                  },
                }}
                custom={runtime.dir}
                exit={{
                  opacity: 0,
                  x: runtime.dir * -30,
                  transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] },
                }}
                initial={{ opacity: 0, x: runtime.dir * 40 }}
                key={runtime.periodKey}
              >
                {runtime.mode === "month" ? (
                  <DesktopMonthGrid
                    activeKey={runtime.activeKey}
                    curMonth={runtime.curMonth}
                    curYear={runtime.curYear}
                    data={runtime.data}
                    onDayClick={runtime.handleDayClick}
                    tasksByDay={runtime.tasksByDay}
                    todayKey={runtime.todayKey}
                  />
                ) : (
                  <WeekGrid
                    activeKey={runtime.activeKey}
                    data={runtime.data}
                    onDayClick={runtime.handleDayClick}
                    tasksByDay={runtime.tasksByDay}
                    todayKey={runtime.todayKey}
                    weekStart={runtime.weekStart}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {runtime.activeKey && runtime.popoverPos && (
          <DayPopover
            dayKey={runtime.activeKey}
            items={runtime.activeItems}
            onClose={() => runtime.setActiveKey(null)}
            pos={runtime.popoverPos}
            tasks={runtime.tasksByDay[runtime.activeKey] ?? []}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
