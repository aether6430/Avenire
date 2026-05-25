export type CalendarMode = "month" | "week";

export interface RevisionItem {
  dueCount: number;
  id: string;
  setId: string;
  title: string;
}

export type RevisionData = Record<string, RevisionItem[]>;

export interface UpcomingTask {
  description: string | null;
  dueAt: string | null;
  id: string;
  status: "pending" | "in_progress" | "completed";
  title: string;
}

export interface StudentCalendarCellInfo {
  day: number;
  isOtherMonth: boolean;
  key: string;
}

export interface StudentCalendarPopoverPos {
  left: number;
  originX: string;
  top: number;
}

interface RectLike {
  bottom: number;
  left: number;
  top: number;
  width: number;
}

export const MONTHS = [
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

export const DAYS_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
export const DAYS_SHORT_DESKTOP = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];
export const DAYS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const startOfUtcDay = (date: Date) =>
  new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );

export const addUtcDays = (date: Date, days: number) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() + days
    )
  );

export const dateKeyUtc = (date: Date) =>
  startOfUtcDay(date).toISOString().slice(0, 10);

export const getDaysInMonth = (year: number, month: number) =>
  new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

export const getFirstDay = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 1)).getUTCDay();

export const getPrevMonthDays = (year: number, month: number) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate();

export const getWeekStartUtc = (date: Date) => {
  const base = startOfUtcDay(date);
  return addUtcDays(base, -base.getUTCDay());
};

export const getWeekDates = (sunday: Date) =>
  Array.from({ length: 7 }, (_, idx) => addUtcDays(sunday, idx));

export const getMonthRange = (year: number, month: number) => ({
  from: new Date(Date.UTC(year, month, 1)),
  to: new Date(Date.UTC(year, month, getDaysInMonth(year, month))),
});

export const getWeekRange = (weekStart: Date) => ({
  from: weekStart,
  to: addUtcDays(weekStart, 6),
});

export const formatRangeLabel = (
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

export const formatSheetDate = (key: string) =>
  new Date(`${key}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

export const formatTaskDue = (dueAt: string | null) => {
  if (!dueAt) {
    return "No due date";
  }

  return new Date(dueAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export function resolveStudentCalendarRevisionDataError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load revision calendar.";
}

export async function fetchRevisionData(
  from: string,
  to: string,
  signal: AbortSignal
): Promise<RevisionData> {
  const params = new URLSearchParams({ from, to });
  const response = await fetch(`/api/flashcards/revision-calendar?${params}`, {
    signal,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(
      payload.error?.trim() || "Unable to load revision calendar."
    );
  }

  const payload = (await response.json()) as { data?: RevisionData };
  return payload.data ?? {};
}

export async function fetchUpcomingTasks(): Promise<UpcomingTask[]> {
  const response = await fetch("/api/tasks?includeCompleted=false&limit=8", {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };

    throw new Error(payload.error?.trim() || "Unable to load upcoming tasks.");
  }

  const payload = (await response.json()) as { tasks?: UpcomingTask[] };
  return payload.tasks ?? [];
}

export function resolveStudentCalendarUpcomingTasksError(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Unable to load upcoming tasks.";
}

export const buildTasksByDay = (upcomingTasks: UpcomingTask[]) =>
  upcomingTasks.reduce<Record<string, UpcomingTask[]>>((acc, task) => {
    if (!task.dueAt) {
      return acc;
    }

    const key = dateKeyUtc(new Date(task.dueAt));
    acc[key] = [...(acc[key] ?? []), task];
    return acc;
  }, {});

export const countRevisionItemsDue = (items: RevisionItem[]) =>
  items.reduce((sum, item) => sum + item.dueCount, 0);

export const calculateMonthDueTotal = (
  data: RevisionData,
  year: number,
  month: number
) => {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  return Object.entries(data)
    .filter(([key]) => key.startsWith(prefix))
    .reduce((sum, [, items]) => sum + countRevisionItemsDue(items), 0);
};

export const calculateWeekDueTotal = (data: RevisionData, weekStart: Date) =>
  getWeekDates(weekStart).reduce((sum, day) => {
    const dayKey = dateKeyUtc(day);
    return sum + countRevisionItemsDue(data[dayKey] ?? []);
  }, 0);

export const buildMobileMonthCells = (
  year: number,
  month: number
): StudentCalendarCellInfo[] => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const prevMonthDays = getPrevMonthDays(year, month);
  const cells: StudentCalendarCellInfo[] = [];

  for (let i = firstDay - 1; i >= 0; i--) {
    const day = prevMonthDays - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({
      day,
      key: dateKeyUtc(new Date(Date.UTC(prevYear, prevMonth, day))),
      isOtherMonth: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      day,
      key: dateKeyUtc(new Date(Date.UTC(year, month, day))),
      isOtherMonth: false,
    });
  }

  while (cells.length % 7 !== 0) {
    const day = cells.length - firstDay - daysInMonth + 1;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({
      day,
      key: dateKeyUtc(new Date(Date.UTC(nextYear, nextMonth, day))),
      isOtherMonth: true,
    });
  }

  return cells;
};

export const buildDesktopMonthCells = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const cells: (number | null)[] = [
    ...new Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, idx) => idx + 1),
  ];

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
};

export const resolveStudentCalendarPopoverPos = (
  cellRect: RectLike,
  containerRect: RectLike,
  width = 280,
  offset = 8
): StudentCalendarPopoverPos => {
  const rawLeft = cellRect.left - containerRect.left;
  const left = Math.max(0, Math.min(rawLeft, containerRect.width - width));
  const top = cellRect.bottom - containerRect.top + offset;
  const originX = `${cellRect.left - containerRect.left + cellRect.width / 2 - left}px`;

  return { left, originX, top };
};
