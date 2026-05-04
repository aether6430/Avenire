"use client";

import { Badge } from "@avenire/ui/components/badge";
import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { cn } from "@avenire/ui/lib/utils";
import {
  BookOpen,
  CalendarBlank,
  CalendarDots as CalendarDays,
  Calendar as CalendarRange,
  CaretLeft as ChevronLeft,
  CaretRight as ChevronRight,
  ListChecks as ListTodo,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type CalendarMode = "month" | "week";

export interface RevisionItem {
  dueCount: number;
  id: string;
  setId: string;
  title: string;
}

export type RevisionData = Record<string, RevisionItem[]>;

interface UpcomingTask {
  description: string | null;
  dueAt: string | null;
  id: string;
  status: "pending" | "in_progress" | "completed";
  title: string;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const DAYS_SHORT_DESKTOP = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

const addUtcDays = (date: Date, days: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days
    )
  );

const dateKeyUtc = (date: Date) =>
  startOfUtcDay(date).toISOString().slice(0, 10);

const getDaysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const getFirstDay = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).getUTCDay();

const getPrevMonthDays = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

const getWeekStartUtc = (date: Date) => {
  const base = startOfUtcDay(date);
  return addUtcDays(base, -base.getUTCDay());
};

const getWeekDates = (sunday: Date) =>
  Array.from({ length: 7 }, (_, idx) => addUtcDays(sunday, idx));

const getMonthRange = (year: number, month: number) => ({
  from: new Date(Date.UTC(year, month, 1)),
  to: new Date(Date.UTC(year, month, getDaysInMonth(year, month))),
});

const getWeekRange = (weekStart: Date) => ({
  from: weekStart,
  to: addUtcDays(weekStart, 6),
});

const formatRangeLabel = (
  mode: CalendarMode,
  year: number,
  month: number,
  weekStart: Date
) => {
  if (mode === "month") {
    return `${MONTHS[month]} ${year}`;
  }

  const end = addUtcDays(weekStart, 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

  if (weekStart.getUTCFullYear() !== end.getUTCFullYear()) {
    return `${weekStart.toLocaleDateString("en-US", { ...opts, year: "numeric" })} - ${end.toLocaleDateString(
      "en-US",
      {
        ...opts,
        year: "numeric",
      }
    )}`;
  }

  if (weekStart.getUTCMonth() !== end.getUTCMonth()) {
    return `${weekStart.toLocaleDateString("en-US", opts)} - ${end.toLocaleDateString(
      "en-US",
      {
        ...opts,
        year: "numeric",
      }
    )}`;
  }

  return `${weekStart.toLocaleDateString("en-US", opts)} - ${end.getUTCDate()}, ${end.getUTCFullYear()}`;
};

const formatSheetDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

const formatTaskDue = (dueAt: string | null) => {
  if (!dueAt) {
    return "No due date";
  }

  return new Date(dueAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

async function fetchRevisionData(
  from: string,
  to: string,
  signal: AbortSignal
): Promise<RevisionData> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`/api/flashcards/revision-calendar?${params}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error("Unable to load revision calendar.");
  }

  const payload = (await response.json()) as { data?: RevisionData };
  return payload.data ?? {};
}

async function fetchUpcomingTasks(): Promise<UpcomingTask[]> {
  const response = await fetch("/api/tasks?includeCompleted=false&limit=8", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load upcoming tasks.");
  }

  const payload = (await response.json()) as { tasks?: UpcomingTask[] };
  return payload.tasks ?? [];
}

function useDesktopLayout() {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mediaQuery.matches);

    sync();
    mediaQuery.addEventListener("change", sync);
    return () => mediaQuery.removeEventListener("change", sync);
  }, []);

  return isDesktop;
}

function DayPills({
  items,
  tasks,
}: {
  items: RevisionItem[];
  tasks: UpcomingTask[];
}) {
  const hasReview = items.length > 0;
  const hasTask = tasks.length > 0;
  const total = items.length + tasks.length;

  if (!(hasReview || hasTask)) {
    return null;
  }

  return (
    <div className="flex w-full flex-col gap-[3px] px-[3px]">
      {hasReview && (
        <div className="h-[3.5px] w-full rounded-full bg-primary/60" />
      )}
      {hasTask && (
        <div className="h-[3.5px] w-full rounded-full bg-amber-400/70" />
      )}
      {total > 2 && (
        <span className="text-center text-[8px] text-muted-foreground leading-none">
          +{total - 2}
        </span>
      )}
    </div>
  );
}

function DaySheet({
  dayKey,
  items,
  tasks,
  onClose,
}: {
  dayKey: string;
  items: RevisionItem[];
  tasks: UpcomingTask[];
  onClose: () => void;
}) {
  const total = items.reduce((sum, item) => sum + item.dueCount, 0);
  const hasAnything = items.length > 0 || tasks.length > 0;

  return (
    <motion.div
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-3"
      exit={{ opacity: 0, y: 10, transition: { duration: 0.14 } }}
      initial={{ opacity: 0, y: 14 }}
      transition={{ type: "spring", stiffness: 340, damping: 28, mass: 0.85 }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-[11px] text-muted-foreground uppercase tracking-widest">
            {formatSheetDate(dayKey)}
          </p>
          {total > 0 && (
            <p className="mt-0.5 font-semibold text-base text-foreground">
              {total}{" "}
              <span className="font-normal text-muted-foreground text-sm">
                cards due
              </span>
            </p>
          )}
        </div>
        <button
          className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {!hasAnything && (
        <p className="py-2 text-center text-muted-foreground text-xs">
          Nothing scheduled
        </p>
      )}

      {items.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="pl-0.5 text-[10px] text-muted-foreground uppercase tracking-widest">
            Flashcards
          </p>
          {items.map((item, idx) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
              initial={{ opacity: 0, x: -6 }}
              key={item.id}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 28,
                delay: idx * 0.04,
              }}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary/10">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
              </div>
              <p className="min-w-0 flex-1 truncate font-medium text-foreground text-sm">
                {item.title}
              </p>
              <span className="shrink-0 font-semibold text-foreground text-sm">
                {item.dueCount}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <p className="pl-0.5 text-[10px] text-muted-foreground uppercase tracking-widest">
            Tasks
          </p>
          {tasks.map((task, idx) => (
            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3 rounded-lg border border-border bg-amber-500/5 px-3 py-2"
              initial={{ opacity: 0, x: -6 }}
              key={task.id}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 28,
                delay: (items.length + idx) * 0.04,
              }}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-500/10">
                <ListTodo className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground text-sm">
                  {task.title}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatTaskDue(task.dueAt)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

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
  items: RevisionItem[];
  tasks: UpcomingTask[];
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
      <div
        className={cn(
          "flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] leading-none transition-colors",
          isToday && !isSelected && "font-semibold text-primary",
          isSelected && "bg-primary font-semibold text-primary-foreground",
          !(isToday || isSelected) && "font-normal text-foreground/80"
        )}
      >
        {day}
      </div>
      <DayPills items={items} tasks={tasks} />
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
  data: RevisionData;
  tasksByDay: Record<string, UpcomingTask[]>;
  selectedKey: string | null;
  todayKey: string;
  onDayClick: (key: string) => void;
}) {
  const daysInMonth = getDaysInMonth(curYear, curMonth);
  const firstDay = getFirstDay(curYear, curMonth);
  const prevMonthDays = getPrevMonthDays(curYear, curMonth);

  interface CellInfo {
    day: number;
    isOtherMonth: boolean;
    key: string;
  }
  const cells: CellInfo[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevMonth = curMonth === 0 ? 11 : curMonth - 1;
    const prevYear = curMonth === 0 ? curYear - 1 : curYear;
    cells.push({
      day,
      key: dateKeyUtc(new Date(Date.UTC(prevYear, prevMonth, day))),
      isOtherMonth: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      key: dateKeyUtc(new Date(Date.UTC(curYear, curMonth, day))),
      isOtherMonth: false,
    });
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - firstDay - daysInMonth + 1;
    const nextMonth = curMonth === 11 ? 0 : curMonth + 1;
    const nextYear = curMonth === 11 ? curYear + 1 : curYear;
    cells.push({
      day,
      key: dateKeyUtc(new Date(Date.UTC(nextYear, nextMonth, day))),
      isOtherMonth: true,
    });
  }

  return (
    <div className="grid grid-cols-7 gap-y-1">
      {cells.map(({ day, key, isOtherMonth }, idx) => (
        <MobileDayCell
          day={day}
          dayKey={key}
          isOtherMonth={isOtherMonth}
          isSelected={key === selectedKey}
          isToday={key === todayKey}
          items={isOtherMonth ? [] : (data[key] ?? [])}
          key={`${key}-${idx}`}
          onClick={onDayClick}
          tasks={isOtherMonth ? [] : (tasksByDay[key] ?? [])}
        />
      ))}
    </div>
  );
}

interface PopoverPos {
  left: number;
  originX: string;
  top: number;
}

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
  pos: PopoverPos;
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
        position: "absolute",
        top: pos.top,
        left: pos.left,
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
  const daysInMonth = getDaysInMonth(curYear, curMonth);
  const firstDay = getFirstDay(curYear, curMonth);
  const cells: (number | null)[] = [
    ...new Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, idx) => idx + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

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
        {cells.map((day, idx) =>
          day == null ? (
            <div className="min-h-[84px]" key={`empty-${idx}`} />
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
              key={day}
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
  const days = getWeekDates(weekStart);

  return (
    <>
      <div className="mb-1 grid grid-cols-7 gap-1">
        {days.map((_, idx) => (
          <div
            className="py-1.5 text-center font-medium text-[11px] text-muted-foreground"
            key={idx}
          >
            {DAYS_FULL[idx]}
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

export function MobileStudentCalendar() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dateKeyUtc(today), [today]);

  const [curYear, setCurYear] = useState(today.getUTCFullYear());
  const [curMonth, setCurMonth] = useState(today.getUTCMonth());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [data, setData] = useState<RevisionData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [dir, setDir] = useState<1 | -1>(1);
  const [isActive, setIsActive] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Map<string, RevisionData>>(new Map());
  const tasksLoadedRef = useRef(false);
  const tasksRequestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadTasks = (background = false) => {
      if (tasksRequestRef.current) {
        return tasksRequestRef.current;
      }

      tasksRequestRef.current = (async () => {
        try {
          const nextTasks = await fetchUpcomingTasks();
          tasksLoadedRef.current = true;
          setUpcomingTasks(nextTasks);
        } catch {
          if (!(background || tasksLoadedRef.current)) {
            setUpcomingTasks([]);
          }
        } finally {
          tasksRequestRef.current = null;
        }
      })();

      return tasksRequestRef.current;
    };

    loadTasks().catch(() => undefined);

    const refresh = () => loadTasks(true).catch(() => undefined);
    window.addEventListener("dashboard.tasks.refresh", refresh);
    return () => window.removeEventListener("dashboard.tasks.refresh", refresh);
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const { from, to } = getMonthRange(curYear, curMonth);
    const rangeKey = `${curYear}-${curMonth}`;
    const cached = cacheRef.current.get(rangeKey);

    if (cached) {
      setData(cached);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchRevisionData(
          dateKeyUtc(from),
          dateKeyUtc(to),
          controller.signal
        );
        cacheRef.current.set(rangeKey, nextData);
        setData(nextData);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load revision calendar."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [curMonth, curYear, isActive]);

  const tasksByDay = useMemo(() => {
    return upcomingTasks.reduce<Record<string, UpcomingTask[]>>((acc, task) => {
      if (!task.dueAt) {
        return acc;
      }
      const key = dateKeyUtc(new Date(task.dueAt));
      acc[key] = [...(acc[key] ?? []), task];
      return acc;
    }, {});
  }, [upcomingTasks]);

  const totalDue = useMemo(() => {
    const prefix = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
    return Object.entries(data)
      .filter(([key]) => key.startsWith(prefix))
      .reduce(
        (sum, [, items]) =>
          sum + items.reduce((itemSum, item) => itemSum + item.dueCount, 0),
        0
      );
  }, [curMonth, curYear, data]);

  const selectedItems = selectedKey ? (data[selectedKey] ?? []) : [];
  const selectedTasks = selectedKey ? (tasksByDay[selectedKey] ?? []) : [];

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

  const periodKey = `${curYear}-${curMonth}`;

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
              className="h-7 w-7"
              onClick={() => navigate(false)}
              size="icon"
              variant="outline"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
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

      <div className="grid grid-cols-7">
        {DAYS_SHORT.map((day, idx) => (
          <div
            className="py-1 text-center font-medium text-[11px] text-muted-foreground"
            key={idx}
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
              <DaySheet
                dayKey={selectedKey}
                items={selectedItems}
                onClose={() => setSelectedKey(null)}
                tasks={selectedTasks}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!(loading || error) && Object.keys(data).length === 0 && (
        <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
          <CalendarBlank className="h-8 w-8 opacity-40" />
          <p className="text-xs">No reviews scheduled this month</p>
        </div>
      )}
    </div>
  );
}

export function DesktopStudentCalendar() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => dateKeyUtc(today), [today]);

  const [mode, setMode] = useState<CalendarMode>("month");
  const [curYear, setCurYear] = useState(today.getUTCFullYear());
  const [curMonth, setCurMonth] = useState(today.getUTCMonth());
  const [weekStart, setWeekStart] = useState<Date>(() =>
    getWeekStartUtc(today)
  );
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const [data, setData] = useState<RevisionData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [isActive, setIsActive] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const cacheRef = useRef<Map<string, RevisionData>>(new Map());
  const tasksLoadedRef = useRef(false);
  const tasksRequestRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    const loadTasks = (background = false) => {
      if (tasksRequestRef.current) {
        return tasksRequestRef.current;
      }

      tasksRequestRef.current = (async () => {
        try {
          const nextTasks = await fetchUpcomingTasks();
          tasksLoadedRef.current = true;
          setUpcomingTasks(nextTasks);
        } catch {
          if (!(background || tasksLoadedRef.current)) {
            setUpcomingTasks([]);
          }
        } finally {
          tasksRequestRef.current = null;
        }
      })();

      return tasksRequestRef.current;
    };

    loadTasks().catch(() => undefined);

    const refresh = () => loadTasks(true).catch(() => undefined);
    window.addEventListener("dashboard.tasks.refresh", refresh);
    return () => window.removeEventListener("dashboard.tasks.refresh", refresh);
  }, []);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isActive) {
      return;
    }

    const { from, to } =
      mode === "month"
        ? getMonthRange(curYear, curMonth)
        : getWeekRange(weekStart);

    const rangeKey = `${mode}-${dateKeyUtc(from)}-${dateKeyUtc(to)}`;
    const cached = cacheRef.current.get(rangeKey);

    if (cached) {
      setData(cached);
      return;
    }

    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const nextData = await fetchRevisionData(
          dateKeyUtc(from),
          dateKeyUtc(to),
          controller.signal
        );
        cacheRef.current.set(rangeKey, nextData);
        setData(nextData);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load revision calendar."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => controller.abort();
  }, [curMonth, curYear, isActive, mode, weekStart]);

  const headerLabel = formatRangeLabel(mode, curYear, curMonth, weekStart);
  const periodKey =
    mode === "month"
      ? `m-${curYear}-${curMonth}`
      : `w-${weekStart.toISOString().slice(0, 10)}`;

  const totalDue = useMemo(() => {
    if (mode === "month") {
      const prefix = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
      return Object.entries(data)
        .filter(([key]) => key.startsWith(prefix))
        .reduce(
          (sum, [, items]) =>
            sum + items.reduce((itemSum, item) => itemSum + item.dueCount, 0),
          0
        );
    }

    return getWeekDates(weekStart).reduce((sum, day) => {
      const dayKey = dateKeyUtc(day);
      return (
        sum +
        (data[dayKey] ?? []).reduce(
          (itemSum, item) => itemSum + item.dueCount,
          0
        )
      );
    }, 0);
  }, [curMonth, curYear, data, mode, weekStart]);

  const tasksByDay = useMemo(() => {
    return upcomingTasks.reduce<Record<string, UpcomingTask[]>>((acc, task) => {
      if (!task.dueAt) {
        return acc;
      }
      const key = dateKeyUtc(new Date(task.dueAt));
      const next = acc[key] ?? [];
      next.push(task);
      acc[key] = next;
      return acc;
    }, {});
  }, [upcomingTasks]);

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

    const rawLeft = cell.left - container.left;
    const left = Math.max(0, Math.min(rawLeft, container.width - 280));
    const top = cell.bottom - container.top + 8;
    const originX = `${cell.left - container.left + cell.width / 2 - left}px`;

    setPopoverPos({ top, left, originX });
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
          className="h-7 w-7"
          onClick={() => navigate(false)}
          size="icon"
          variant="outline"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
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

export function StudentCalendar() {
  const isDesktop = useDesktopLayout();
  return isDesktop ? <DesktopStudentCalendar /> : <MobileStudentCalendar />;
}
