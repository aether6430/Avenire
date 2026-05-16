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
  ListChecks as ListTodo,
} from "@phosphor-icons/react";
import { BookOpen } from "@phosphor-icons/react/BookOpen";
import { AnimatePresence, motion } from "motion/react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CalendarMode,
  RevisionData,
  RevisionItem,
  StudentCalendarPopoverPos,
  UpcomingTask,
} from "./student-calendar-model";
import {
  addUtcDays,
  buildDesktopMonthCells,
  buildTasksByDay,
  calculateMonthDueTotal,
  calculateWeekDueTotal,
  DAYS_FULL,
  DAYS_SHORT_DESKTOP,
  dateKeyUtc,
  formatRangeLabel,
  formatTaskDue,
  getMonthRange,
  getWeekDates,
  getWeekRange,
  getWeekStartUtc,
  resolveStudentCalendarPopoverPos,
} from "./student-calendar-model";
import {
  useStudentCalendarActivation,
  useStudentCalendarRangeData,
  useStudentCalendarUpcomingTasks,
} from "./use-student-calendar-data";

function DayPopover({
  dayKey,
  items,
  tasks,
  pos,
  onClose,
}: {
  dayKey: string;
  items: RevisionItem[];
  tasks: UpcomingTask[];
  pos: StudentCalendarPopoverPos;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const total = items.reduce((sum, item) => sum + item.dueCount, 0);
  const label = new Date(`${dayKey}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  useEffect(() => {
    const handler = (event: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const timeout = window.setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("mousedown", handler);
    };
  }, [onClose]);

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
      exit={{
        opacity: 0,
        scale: 0.96,
        y: -4,
        transition: { duration: 0.12, ease: "easeIn" },
      }}
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      key={dayKey}
      ref={ref}
      style={{
        left: pos.left,
        position: "absolute",
        top: pos.top,
        transformOrigin: `${pos.originX} top`,
        width: 272,
        zIndex: 50,
      }}
      transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.9 }}
    >
      <div className="border-border border-b px-4 pt-3 pb-2.5">
        <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
          {label}
        </p>
        <p className="mt-0.5 font-semibold text-base text-foreground">
          {total}{" "}
          <span className="font-normal text-muted-foreground text-sm">
            cards due
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-0.5 p-1.5">
        {items.map((item, idx) => (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-muted/60"
            initial={{ opacity: 0, x: -8 }}
            key={item.id}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 28,
              delay: 0.04 + idx * 0.04,
            }}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground text-sm leading-none">
                {item.title}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="font-semibold text-foreground text-sm">
                {item.dueCount}
              </span>
            </div>
          </motion.div>
        ))}

        {tasks.length > 0 && (
          <div className="border-border/70 border-t px-3 pt-2 pb-1">
            <p className="mb-1.5 text-[10px] text-muted-foreground uppercase tracking-widest">
              Tasks
            </p>
            <div className="flex flex-col gap-1">
              {tasks.map((task) => (
                <div
                  className="flex items-start gap-2 rounded-lg bg-secondary/40 px-2 py-1.5"
                  key={task.id}
                >
                  <ListTodo className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground text-xs">
                      {task.title}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {task.dueAt ? formatTaskDue(task.dueAt) : "No due date"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DesktopDayCell({
  day,
  dayKey,
  items,
  tasks,
  isToday,
  isActive,
  onClick,
  tall = false,
}: {
  day: number;
  dayKey: string;
  items: RevisionItem[];
  tasks: UpcomingTask[];
  isToday: boolean;
  isActive: boolean;
  onClick: (event: ReactMouseEvent<HTMLButtonElement>, key: string) => void;
  tall?: boolean;
}) {
  const hasItems = items.length > 0;
  const hasTasks = tasks.length > 0;
  const shownItems = items.slice(0, tall ? 5 : 2);
  const overflow = items.length - shownItems.length;
  const shownTasks = tasks.slice(0, tall ? 3 : 1);
  const taskOverflow = tasks.length - shownTasks.length;

  return (
    <button
      className={cn(
        "relative flex w-full select-none flex-col gap-1.5 rounded-lg border p-2 text-left transition-colors duration-150",
        tall ? "min-h-[190px]" : "min-h-[108px]",
        hasItems || hasTasks ? "cursor-pointer" : "cursor-default",
        isActive && "border-primary/50 bg-primary/5",
        !isActive && isToday && "border-primary/30 bg-primary/[0.04]",
        !(isActive || isToday) && "border-border bg-card hover:bg-muted/50",
        !(hasItems || hasTasks) && "opacity-50"
      )}
      disabled={!(hasItems || hasTasks)}
      onClick={(event) => (hasItems || hasTasks) && onClick(event, dayKey)}
      type="button"
    >
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            "text-sm leading-none",
            isToday
              ? "font-semibold text-primary"
              : "font-normal text-muted-foreground"
          )}
        >
          {day}
        </span>
        {isToday && (
          <Badge
            className="h-4 rounded-md border-primary/20 bg-primary/10 px-1.5 font-medium text-[9px] text-primary"
            variant="secondary"
          >
            today
          </Badge>
        )}
      </div>

      {(hasItems || hasTasks) && (
        <div className="flex w-full flex-col gap-1">
          {shownItems.map((item) => (
            <div
              className="flex items-center gap-1.5 rounded-md bg-muted/40 px-1.5 py-0.5"
              key={item.id}
            >
              <BookOpen className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                {item.title}
              </span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {item.dueCount}
              </span>
            </div>
          ))}
          {overflow > 0 && (
            <span className="pl-0.5 text-[10px] text-muted-foreground">
              +{overflow} more
            </span>
          )}
          {shownTasks.length > 0 && (
            <div className="mt-1 flex flex-col gap-1">
              {shownTasks.map((task) => (
                <div
                  className="flex items-center gap-1.5 rounded-md bg-amber-500/10 px-1.5 py-0.5"
                  key={task.id}
                >
                  <ListTodo className="h-2.5 w-2.5 shrink-0 text-amber-600" />
                  <span className="min-w-0 flex-1 truncate text-[11px] text-foreground">
                    {task.title}
                  </span>
                </div>
              ))}
              {taskOverflow > 0 && (
                <span className="pl-0.5 text-[10px] text-muted-foreground">
                  +{taskOverflow} more tasks
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}

function DesktopMonthGrid({
  curYear,
  curMonth,
  data,
  tasksByDay,
  activeKey,
  todayKey,
  onDayClick,
}: {
  curYear: number;
  curMonth: number;
  data: RevisionData;
  tasksByDay: Record<string, UpcomingTask[]>;
  activeKey: string | null;
  todayKey: string;
  onDayClick: (event: ReactMouseEvent<HTMLButtonElement>, key: string) => void;
}) {
  const cells = useMemo(
    () => buildDesktopMonthCells(curYear, curMonth),
    [curMonth, curYear]
  );
  const cellEntries = useMemo(() => {
    let leadingEmptyCount = 0;
    let trailingEmptyCount = 0;
    let hasSeenDay = false;

    return cells.map((day) => {
      if (day == null) {
        const cellKey = hasSeenDay
          ? `empty-trailing-${trailingEmptyCount++}`
          : `empty-leading-${leadingEmptyCount++}`;
        return { cellKey, day };
      }

      hasSeenDay = true;
      return { cellKey: `day-${day}`, day };
    });
  }, [cells]);

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
        {cellEntries.map(({ cellKey, day }) =>
          day == null ? (
            <div className="min-h-[84px]" key={cellKey} />
          ) : (
            <DesktopDayCell
              day={day}
              dayKey={dateKeyUtc(new Date(Date.UTC(curYear, curMonth, day)))}
              isActive={
                activeKey ===
                dateKeyUtc(new Date(Date.UTC(curYear, curMonth, day)))
              }
              isToday={
                dateKeyUtc(new Date(Date.UTC(curYear, curMonth, day))) ===
                todayKey
              }
              items={
                data[dateKeyUtc(new Date(Date.UTC(curYear, curMonth, day)))] ??
                []
              }
              key={cellKey}
              onClick={onDayClick}
              tasks={
                tasksByDay[
                  dateKeyUtc(new Date(Date.UTC(curYear, curMonth, day)))
                ] ?? []
              }
            />
          )
        )}
      </div>
    </>
  );
}

function WeekGrid({
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
  const days = useMemo(() => getWeekDates(weekStart), [weekStart]);

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

export function DesktopStudentCalendar() {
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

  return (
    <div className="relative w-full space-y-3" ref={containerRef}>
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
              key={headerLabel}
            >
              {headerLabel}
            </motion.h2>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Badge
            className="font-normal text-muted-foreground text-xs"
            variant="outline"
          >
            <span className="mr-1 font-semibold text-foreground">
              {totalDue}
            </span>
            cards due
          </Badge>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <Button
          aria-label="Previous period"
          className="h-7 w-7"
          onClick={() => navigate(false)}
          size="icon"
          variant="outline"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          aria-label="Next period"
          className="h-7 w-7"
          onClick={() => navigate(true)}
          size="icon"
          variant="outline"
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button
          className="h-7 px-2.5 text-xs"
          onClick={goToday}
          size="sm"
          variant="outline"
        >
          Today
        </Button>

        <div className="flex-1" />

        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {(["month", "week"] as CalendarMode[]).map((nextMode) => (
            <button
              className={cn(
                "flex h-6 items-center gap-1.5 rounded-md px-2.5 font-medium text-xs transition-colors",
                mode === nextMode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={nextMode}
              onClick={() => {
                setMode(nextMode);
                setActiveKey(null);
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
          {loading && (
            <div className="inline-flex items-center gap-2 text-muted-foreground text-xs">
              <Spinner className="size-3.5" />
              Loading upcoming reviews...
            </div>
          )}

          {error && (
            <div className="text-muted-foreground text-xs">{error}</div>
          )}
          {tasksError && (
            <div className="text-muted-foreground text-xs">{tasksError}</div>
          )}

          <div className="overflow-hidden">
            <AnimatePresence custom={dir} initial={false} mode="wait">
              <motion.div
                animate={{
                  opacity: 1,
                  x: 0,
                  transition: {
                    type: "spring",
                    stiffness: 280,
                    damping: 28,
                    mass: 0.85,
                  },
                }}
                custom={dir}
                exit={{
                  opacity: 0,
                  x: dir * -30,
                  transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] },
                }}
                initial={{ opacity: 0, x: dir * 40 }}
                key={periodKey}
              >
                {mode === "month" ? (
                  <DesktopMonthGrid
                    activeKey={activeKey}
                    curMonth={curMonth}
                    curYear={curYear}
                    data={data}
                    onDayClick={handleDayClick}
                    tasksByDay={tasksByDay}
                    todayKey={todayKey}
                  />
                ) : (
                  <WeekGrid
                    activeKey={activeKey}
                    data={data}
                    onDayClick={handleDayClick}
                    tasksByDay={tasksByDay}
                    todayKey={todayKey}
                    weekStart={weekStart}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeKey && popoverPos && (
          <DayPopover
            dayKey={activeKey}
            items={activeItems}
            onClose={() => setActiveKey(null)}
            pos={popoverPos}
            tasks={tasksByDay[activeKey] ?? []}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
