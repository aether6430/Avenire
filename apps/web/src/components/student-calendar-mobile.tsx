"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
} from "@phosphor-icons/react";
import { CalendarBlank } from "@phosphor-icons/react/CalendarBlank";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import {
  buildMobileMonthCells,
  buildTasksByDay,
  calculateMonthDueTotal,
  DAYS_SHORT,
  dateKeyUtc,
  getMonthRange,
  MONTHS,
} from "./student-calendar-model";
import {
  StudentCalendarDayPills,
  StudentCalendarDaySheet,
  studentCalendarTodayBadgeClasses,
} from "./student-calendar-shared";
import {
  useStudentCalendarActivation,
  useStudentCalendarRangeData,
  useStudentCalendarUpcomingTasks,
} from "./use-student-calendar-data";

function MobileDayCell({
  day,
  dayKey,
  isToday,
  isSelected,
  isOtherMonth,
  items,
  tasks,
  onClick,
}: {
  day: number;
  dayKey: string;
  isToday: boolean;
  isSelected: boolean;
  isOtherMonth: boolean;
  items: Parameters<typeof StudentCalendarDayPills>[0]["items"];
  tasks: Parameters<typeof StudentCalendarDayPills>[0]["tasks"];
  onClick: (key: string) => void;
}) {
  const hasEvents = items.length > 0 || tasks.length > 0;

  return (
    <button
      className={cn(
        "flex flex-col items-center gap-1 rounded-lg py-1.5 transition-colors",
        hasEvents ? "cursor-pointer" : "cursor-default",
        isSelected && "bg-primary/8",
        !isSelected && hasEvents && "hover:bg-muted/60",
        isOtherMonth && "opacity-30"
      )}
      onClick={() => hasEvents && onClick(dayKey)}
      type="button"
    >
      <div className={studentCalendarTodayBadgeClasses(isToday, isSelected)}>
        {day}
      </div>
      <StudentCalendarDayPills items={items} tasks={tasks} />
    </button>
  );
}

function MobileMonthGrid({
  curYear,
  curMonth,
  data,
  tasksByDay,
  selectedKey,
  todayKey,
  onDayClick,
}: {
  curYear: number;
  curMonth: number;
  data: ReturnType<typeof useStudentCalendarRangeData>["data"];
  tasksByDay: ReturnType<typeof buildTasksByDay>;
  selectedKey: string | null;
  todayKey: string;
  onDayClick: (key: string) => void;
}) {
  const cells = useMemo(
    () => buildMobileMonthCells(curYear, curMonth),
    [curMonth, curYear]
  );

  return (
    <div className="grid grid-cols-7 gap-y-1">
      {cells.map(({ day, key, isOtherMonth }) => (
        <MobileDayCell
          day={day}
          dayKey={key}
          isOtherMonth={isOtherMonth}
          isSelected={key === selectedKey}
          isToday={key === todayKey}
          items={isOtherMonth ? [] : (data[key] ?? [])}
          key={key}
          onClick={onDayClick}
          tasks={isOtherMonth ? [] : (tasksByDay[key] ?? [])}
        />
      ))}
    </div>
  );
}

export function MobileStudentCalendar() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dateKeyUtc(today), [today]);
  const { containerRef, isActive } =
    useStudentCalendarActivation<HTMLDivElement>();
  const { upcomingTasks, error: tasksError } =
    useStudentCalendarUpcomingTasks();

  const [curYear, setCurYear] = useState(today.getUTCFullYear());
  const [curMonth, setCurMonth] = useState(today.getUTCMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);

  const { from, to } = useMemo(
    () => getMonthRange(curYear, curMonth),
    [curMonth, curYear]
  );
  const { data, error, loading } = useStudentCalendarRangeData({
    active: isActive,
    fromKey: dateKeyUtc(from),
    rangeKey: `${curYear}-${curMonth}`,
    toKey: dateKeyUtc(to),
  });

  const tasksByDay = useMemo(
    () => buildTasksByDay(upcomingTasks),
    [upcomingTasks]
  );
  const totalDue = useMemo(
    () => calculateMonthDueTotal(data, curYear, curMonth),
    [curMonth, curYear, data]
  );
  const selectedItems = selectedKey ? (data[selectedKey] ?? []) : [];
  const selectedTasks = selectedKey ? (tasksByDay[selectedKey] ?? []) : [];
  const periodKey = `${curYear}-${curMonth}`;

  const navigate = (forward: boolean) => {
    setDir(forward ? 1 : -1);
    setSelectedKey(null);
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
  };

  const goToday = () => {
    setDir(1);
    setCurYear(today.getUTCFullYear());
    setCurMonth(today.getUTCMonth());
    setSelectedKey(todayKey);
  };

  return (
    <div className="flex w-full flex-col gap-4" ref={containerRef}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <AnimatePresence initial={false} mode="wait">
            <motion.div
              animate={{
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 320, damping: 26 },
              }}
              exit={{ opacity: 0, y: 4, transition: { duration: 0.1 } }}
              initial={{ opacity: 0, y: -4 }}
              key={`${curMonth}-${curYear}`}
            >
              <h2 className="font-semibold text-foreground text-xl tracking-tight">
                {MONTHS[curMonth]}
              </h2>
              <p className="text-muted-foreground text-xs">{curYear}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {loading && <Spinner className="size-3.5 text-muted-foreground" />}
          {totalDue > 0 && (
            <Badge
              className="font-normal text-muted-foreground text-xs"
              variant="outline"
            >
              <span className="mr-1 font-semibold text-foreground">
                {totalDue}
              </span>
              due
            </Badge>
          )}
          <div className="flex items-center gap-1">
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
          </div>
          <Button
            className="h-7 px-2.5 text-xs"
            onClick={goToday}
            size="sm"
            variant="outline"
          >
            Today
          </Button>
        </div>
      </div>

      {error && <p className="text-muted-foreground text-xs">{error}</p>}
      {tasksError && (
        <p className="text-muted-foreground text-xs">{tasksError}</p>
      )}

      <div className="grid grid-cols-7">
        {DAYS_SHORT.map((day, index) => (
          <div
            className="py-1 text-center font-medium text-[11px] text-muted-foreground"
            key={`${day}-${index}`}
          >
            {day}
          </div>
        ))}
      </div>

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
              x: dir * -24,
              transition: { duration: 0.13, ease: [0.32, 0, 0.67, 0] },
            }}
            initial={{ opacity: 0, x: dir * 32 }}
            key={periodKey}
          >
            <MobileMonthGrid
              curMonth={curMonth}
              curYear={curYear}
              data={data}
              onDayClick={(key) =>
                setSelectedKey((prev) => (prev === key ? null : key))
              }
              selectedKey={selectedKey}
              tasksByDay={tasksByDay}
              todayKey={todayKey}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {selectedKey && (
          <motion.div
            animate={{ opacity: 1, height: "auto" }}
            className="overflow-hidden"
            exit={{ opacity: 0, height: 0, transition: { duration: 0.16 } }}
            initial={{ opacity: 0, height: 0 }}
            key={selectedKey}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 28,
              mass: 0.85,
            }}
          >
            <div className="rounded-xl border border-border bg-card p-4">
              <StudentCalendarDaySheet
                dayKey={selectedKey}
                items={selectedItems}
                onClose={() => setSelectedKey(null)}
                tasks={selectedTasks}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!(loading || error || tasksError) && Object.keys(data).length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <CalendarBlank className="h-8 w-8 opacity-40" />
          <p className="text-xs">No reviews scheduled this month</p>
        </div>
      )}
    </div>
  );
}
