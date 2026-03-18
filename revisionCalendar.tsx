"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  FlaskConical,
  Divide,
  Dna,
  BookOpen,
  RotateCcw,
  PenLine,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SessionType   = "flashcard" | "review" | "practice";
export type CalendarMode  = "month" | "week";

export type RevisionItem = {
  id: string;
  subject: "physics" | "chemistry" | "maths" | "biology";
  topic: string;
  type: SessionType;
  dueCount: number;
};

export type RevisionData = { [dateKey: string]: RevisionItem[] };

// ─── Subject config ───────────────────────────────────────────────────────────

const SUBJECT_CONFIG = {
  physics: {
    label: "Physics",
    Icon: Zap,
    color: "text-violet-600 dark:text-violet-400",
    chipBg: "bg-violet-50 dark:bg-violet-950/60",
    chipText: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-100 dark:bg-violet-900/50",
  },
  chemistry: {
    label: "Chemistry",
    Icon: FlaskConical,
    color: "text-emerald-600 dark:text-emerald-400",
    chipBg: "bg-emerald-50 dark:bg-emerald-950/60",
    chipText: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/50",
  },
  maths: {
    label: "Maths",
    Icon: Divide,
    color: "text-amber-600 dark:text-amber-400",
    chipBg: "bg-amber-50 dark:bg-amber-950/60",
    chipText: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-100 dark:bg-amber-900/50",
  },
  biology: {
    label: "Biology",
    Icon: Dna,
    color: "text-pink-600 dark:text-pink-400",
    chipBg: "bg-pink-50 dark:bg-pink-950/60",
    chipText: "text-pink-700 dark:text-pink-300",
    iconBg: "bg-pink-100 dark:bg-pink-900/50",
  },
} as const;

const SESSION_CONFIG: Record<SessionType, { label: string; Icon: React.FC<{ className?: string }> }> = {
  flashcard: { label: "Flashcards", Icon: BookOpen },
  review:    { label: "Review",     Icon: RotateCcw },
  practice:  { label: "Practice",   Icon: PenLine },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS    = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DAYS_FULL  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function dateKey(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y: number, m: number)    { return new Date(y, m, 1).getDay(); }

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function getWeekDates(sunday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function formatWeekRange(sunday: Date): string {
  const saturday = new Date(sunday);
  saturday.setDate(saturday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  if (sunday.getFullYear() !== saturday.getFullYear())
    return `${sunday.toLocaleDateString("en-US", { ...opts, year: "numeric" })} – ${saturday.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  if (sunday.getMonth() !== saturday.getMonth())
    return `${sunday.toLocaleDateString("en-US", opts)} – ${saturday.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
  return `${sunday.toLocaleDateString("en-US", opts)} – ${saturday.getDate()}, ${saturday.getFullYear()}`;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const today = new Date();
const ty = today.getFullYear(), tm = today.getMonth(), td = today.getDate();

const MOCK_DATA: RevisionData = {
  [dateKey(ty, tm, 3)]: [
    { id: "1", subject: "physics",   topic: "Kinematics",           type: "flashcard", dueCount: 24 },
    { id: "2", subject: "chemistry", topic: "Organic Reactions",     type: "review",    dueCount: 18 },
    { id: "3", subject: "maths",     topic: "Integration",           type: "practice",  dueCount: 12 },
  ],
  [dateKey(ty, tm, 5)]: [
    { id: "4", subject: "physics",  topic: "Thermodynamics",         type: "flashcard", dueCount: 31 },
    { id: "5", subject: "biology",  topic: "Cell Division",          type: "review",    dueCount: 9  },
  ],
  [dateKey(ty, tm, 8)]: [
    { id: "6", subject: "maths",    topic: "Differential Equations", type: "flashcard", dueCount: 40 },
  ],
  [dateKey(ty, tm, 10)]: [
    { id: "7",  subject: "chemistry", topic: "Electrochemistry",     type: "practice",  dueCount: 22 },
    { id: "8",  subject: "physics",   topic: "Optics",               type: "review",    dueCount: 15 },
    { id: "9",  subject: "maths",     topic: "Vectors",              type: "flashcard", dueCount: 8  },
    { id: "10", subject: "biology",   topic: "Genetics",             type: "review",    dueCount: 19 },
  ],
  [dateKey(ty, tm, td)]: [
    { id: "11", subject: "physics",   topic: "Waves & SHM",          type: "flashcard", dueCount: 28 },
    { id: "12", subject: "chemistry", topic: "p-Block Elements",     type: "review",    dueCount: 14 },
  ],
  [dateKey(ty, tm, td + 2)]: [
    { id: "13", subject: "maths",    topic: "Probability",           type: "practice",  dueCount: 17 },
  ],
  [dateKey(ty, tm, td + 4)]: [
    { id: "14", subject: "physics",   topic: "Modern Physics",       type: "flashcard", dueCount: 35 },
    { id: "15", subject: "chemistry", topic: "Coord. Compounds",     type: "review",    dueCount: 20 },
  ],
  [dateKey(ty, tm, 22)]: [
    { id: "16", subject: "biology",  topic: "Nervous System",        type: "flashcard", dueCount: 11 },
  ],
  [dateKey(ty, tm, 25)]: [
    { id: "17", subject: "maths",     topic: "3D Geometry",          type: "practice",  dueCount: 26 },
    { id: "18", subject: "physics",   topic: "EM Induction",         type: "flashcard", dueCount: 33 },
    { id: "19", subject: "chemistry", topic: "Biomolecules",         type: "review",    dueCount: 7  },
  ],
};

// ─── Popover ──────────────────────────────────────────────────────────────────

type PopoverPos = { top: number; left: number; originX: string };

function DayPopover({
  dayKey: dk,
  items,
  pos,
  onClose,
}: {
  dayKey: string;
  items: RevisionItem[];
  pos: PopoverPos;
  onClose: () => void;
}) {
  const ref   = useRef<HTMLDivElement>(null);
  const total = items.reduce((s, i) => s + i.dueCount, 0);
  const label = new Date(dk + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    // slight delay so the click that opened it doesn't immediately close it
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      key={dk}
      initial={{ opacity: 0, scale: 0.94, y: -6 }}
      animate={{ opacity: 1, scale: 1,    y: 0  }}
      exit={{   opacity: 0, scale: 0.96,  y: -4, transition: { duration: 0.12, ease: "easeIn" } }}
      transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.9 }}
      style={{
        position: "absolute",
        top: pos.top,
        left: pos.left,
        transformOrigin: `${pos.originX} top`,
        zIndex: 50,
        width: 272,
      }}
      className="rounded-xl border border-border bg-popover shadow-lg overflow-hidden"
    >
      <div className="px-4 pt-3 pb-2.5 border-b border-border">
        <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-medium">{label}</p>
        <p className="text-base font-semibold text-foreground mt-0.5">
          {total}{" "}
          <span className="text-sm font-normal text-muted-foreground">cards due</span>
        </p>
      </div>

      <div className="p-1.5 flex flex-col gap-0.5">
        {items.map((item, idx) => {
          const sub  = SUBJECT_CONFIG[item.subject];
          const sess = SESSION_CONFIG[item.type];
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1,  x: 0  }}
              transition={{ type: "spring", stiffness: 400, damping: 28, delay: 0.04 + idx * 0.04 }}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer"
            >
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", sub.iconBg)}>
                <sub.Icon className={cn("w-4 h-4", sub.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-none">{sub.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.topic}</p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-sm font-semibold text-foreground">{item.dueCount}</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <sess.Icon className="w-2.5 h-2.5" />
                  <span className="text-[10px]">{sess.label}</span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="px-3 pb-3 pt-1 border-t border-border mt-0.5">
        <Button size="sm" className="w-full">Start session</Button>
      </div>
    </motion.div>
  );
}

// ─── Day cell ─────────────────────────────────────────────────────────────────

function DayCell({
  day, dayKey: dk, items, isToday, isActive, onClick, tall = false,
}: {
  day: number; dayKey: string; items: RevisionItem[];
  isToday: boolean; isActive: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>, key: string) => void;
  tall?: boolean;
}) {
  const hasItems = items.length > 0;
  const shown    = items.slice(0, tall ? 5 : 2);
  const overflow = items.length - shown.length;

  return (
    <button
      onClick={e => hasItems && onClick(e, dk)}
      disabled={!hasItems}
      className={cn(
        "relative w-full rounded-lg border p-2 flex flex-col gap-1.5 text-left transition-colors duration-150 select-none",
        tall ? "min-h-[180px]" : "min-h-[84px]",
        hasItems ? "cursor-pointer" : "cursor-default",
        isActive
          ? "border-primary/50 bg-primary/5"
          : isToday
            ? "border-primary/30 bg-primary/[0.04]"
            : "border-border bg-card hover:bg-muted/50",
        !hasItems && "opacity-50",
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn(
          "text-sm leading-none",
          isToday ? "text-primary font-semibold" : "text-muted-foreground font-normal",
        )}>
          {day}
        </span>
        {isToday && (
          <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-medium bg-primary/10 text-primary border-primary/20 rounded-sm">
            today
          </Badge>
        )}
      </div>

      {hasItems && (
        <div className="flex flex-col gap-1 w-full">
          {shown.map(item => {
            const sub = SUBJECT_CONFIG[item.subject];
            return (
              <div key={item.id} className={cn("flex items-center gap-1.5 rounded-[5px] px-1.5 py-0.5", sub.chipBg)}>
                <sub.Icon className={cn("w-2.5 h-2.5 shrink-0", sub.color)} />
                <span className={cn("text-[11px] flex-1 min-w-0 truncate", sub.chipText)}>{sub.label}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{item.dueCount}</span>
              </div>
            );
          })}
          {overflow > 0 && (
            <span className="text-[10px] text-muted-foreground pl-0.5">+{overflow} more</span>
          )}
        </div>
      )}
    </button>
  );
}

// ─── Month grid ───────────────────────────────────────────────────────────────

function MonthGrid({
  curYear, curMonth, data, activeKey, todayKey, onDayClick,
}: {
  curYear: number; curMonth: number;
  data: RevisionData; activeKey: string | null; todayKey: string;
  onDayClick: (e: React.MouseEvent<HTMLButtonElement>, key: string) => void;
}) {
  const daysInMonth = getDaysInMonth(curYear, curMonth);
  const firstDay    = getFirstDay(curYear, curMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAYS_SHORT.map(d => (
          <div key={d} className="text-center text-[11px] text-muted-foreground py-1.5 font-medium">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) =>
          day == null ? (
            <div key={`empty-${i}`} className="min-h-[84px]" />
          ) : (
            <DayCell
              key={day}
              day={day}
              dayKey={dateKey(curYear, curMonth, day)}
              items={data[dateKey(curYear, curMonth, day)] ?? []}
              isToday={dateKey(curYear, curMonth, day) === todayKey}
              isActive={activeKey === dateKey(curYear, curMonth, day)}
              onClick={onDayClick}
            />
          )
        )}
      </div>
    </>
  );
}

// ─── Week grid ────────────────────────────────────────────────────────────────

function WeekGrid({
  weekStart, data, activeKey, todayKey, onDayClick,
}: {
  weekStart: Date;
  data: RevisionData; activeKey: string | null; todayKey: string;
  onDayClick: (e: React.MouseEvent<HTMLButtonElement>, key: string) => void;
}) {
  const days = getWeekDates(weekStart);

  return (
    <>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map((_, i) => (
          <div key={i} className="text-center text-[11px] text-muted-foreground py-1.5 font-medium">
            {DAYS_FULL[i]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map(d => {
          const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
          return (
            <DayCell
              key={k}
              day={d.getDate()}
              dayKey={k}
              items={data[k] ?? []}
              isToday={k === todayKey}
              isActive={activeKey === k}
              onClick={onDayClick}
              tall
            />
          );
        })}
      </div>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface RevisionCalendarProps {
  data?: RevisionData;
  onStartSession?: (dayKey: string, items: RevisionItem[]) => void;
}

export default function RevisionCalendar({
  data = MOCK_DATA,
  onStartSession,
}: RevisionCalendarProps) {
  const [mode,       setMode]       = useState<CalendarMode>("month");
  const [curYear,    setCurYear]    = useState(ty);
  const [curMonth,   setCurMonth]   = useState(tm);
  const [weekStart,  setWeekStart]  = useState<Date>(() => getWeekStart(today));
  const [activeKey,  setActiveKey]  = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPos | null>(null);
  const [dir,        setDir]        = useState<1 | -1>(1);

  // Stable container ref — popover is positioned relative to this
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Navigation ──────────────────────────────────────────────────────────────

  const navigate = (forward: boolean) => {
    setDir(forward ? 1 : -1);
    setActiveKey(null);
    if (mode === "month") {
      setCurMonth(m => {
        if (forward) { if (m === 11) { setCurYear(y => y + 1); return 0;  } return m + 1; }
        else         { if (m === 0)  { setCurYear(y => y - 1); return 11; } return m - 1; }
      });
    } else {
      setWeekStart(ws => {
        const next = new Date(ws);
        next.setDate(next.getDate() + (forward ? 7 : -7));
        return next;
      });
    }
  };

  const goToday = () => {
    setDir(1);
    setActiveKey(null);
    setCurYear(ty); setCurMonth(tm);
    setWeekStart(getWeekStart(today));
  };

  const switchMode = (m: CalendarMode) => {
    setMode(m);
    setActiveKey(null);
  };

  // ── Day click — measure relative to containerRef ─────────────────────────

  const handleDayClick = (e: React.MouseEvent<HTMLButtonElement>, key: string) => {
    if (activeKey === key) { setActiveKey(null); return; }

    const cell      = e.currentTarget.getBoundingClientRect();
    const container = containerRef.current!.getBoundingClientRect();

    const rawLeft = cell.left - container.left;
    const left    = Math.max(0, Math.min(rawLeft, container.width - 280));
    const top     = cell.bottom - container.top + 8;
    const originX = `${cell.left - container.left + cell.width / 2 - left}px`;

    setPopoverPos({ top, left, originX });
    setActiveKey(key);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const headerLabel = mode === "month"
    ? `${MONTHS[curMonth]}, ${curYear}`
    : formatWeekRange(weekStart);

  // stable key so AnimatePresence knows when to swap cells
  const periodKey = mode === "month"
    ? `m-${curYear}-${curMonth}`
    : `w-${weekStart.toISOString().slice(0, 10)}`;

  const totalDue = (() => {
    if (mode === "month") {
      const prefix = `${curYear}-${String(curMonth + 1).padStart(2, "0")}`;
      return Object.entries(data)
        .filter(([k]) => k.startsWith(prefix))
        .reduce((acc, [, items]) => acc + items.reduce((s, i) => s + i.dueCount, 0), 0);
    } else {
      return getWeekDates(weekStart).reduce((acc, d) => {
        const k = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        return acc + (data[k] ?? []).reduce((s, i) => s + i.dueCount, 0);
      }, 0);
    }
  })();

  const todayKey    = dateKey(ty, tm, td);
  const activeItems = activeKey ? (data[activeKey] ?? []) : [];

  return (
    // containerRef wraps everything — popover positions relative to this
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto space-y-4 p-4">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={headerLabel}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } }}
              exit={{   opacity: 0, y:  5, transition: { duration: 0.12 } }}
              className="text-xl font-semibold text-foreground tracking-tight"
            >
              {headerLabel}
            </motion.h2>
          </AnimatePresence>
          <p className="text-sm text-muted-foreground mt-0.5">Revision schedule</p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-3">
            {(["flashcard", "review", "practice"] as SessionType[]).map(t => {
              const dot = t === "flashcard" ? "bg-violet-500" : t === "review" ? "bg-sky-500" : "bg-amber-500";
              return (
                <span key={t} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn("w-1.5 h-1.5 rounded-full", dot)} />
                  {SESSION_CONFIG[t].label}
                </span>
              );
            })}
          </div>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
            <span className="font-semibold text-foreground mr-1">{totalDue}</span>
            cards due
          </Badge>
        </div>
      </div>

      {/* ── Controls row ── */}
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigate(false)}>
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => navigate(true)}>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs px-2.5" onClick={goToday}>
          Today
        </Button>

        <div className="flex-1" />

        {/* Mode toggle */}
        <div className="flex items-center gap-0.5 rounded-lg border border-border bg-muted/40 p-0.5">
          {(["month", "week"] as CalendarMode[]).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2.5 h-6 text-xs font-medium transition-colors",
                mode === m
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "month" ? <CalendarDays className="w-3 h-3" /> : <CalendarRange className="w-3 h-3" />}
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* ── Grid — slides on nav ── */}
      <div className="overflow-hidden">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.div
            key={periodKey}
            custom={dir}
            initial={{ opacity: 0, x: dir * 40 }}
            animate={{ opacity: 1, x: 0, transition: { type: "spring", stiffness: 280, damping: 28, mass: 0.85 } }}
            exit={{ opacity: 0, x: dir * -30, transition: { duration: 0.15, ease: [0.32, 0, 0.67, 0] } }}
          >
            {mode === "month" ? (
              <MonthGrid
                curYear={curYear}
                curMonth={curMonth}
                data={data}
                activeKey={activeKey}
                todayKey={todayKey}
                onDayClick={handleDayClick}
              />
            ) : (
              <WeekGrid
                weekStart={weekStart}
                data={data}
                activeKey={activeKey}
                todayKey={todayKey}
                onDayClick={handleDayClick}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Popover — outside overflow wrapper, positioned via containerRef ── */}
      <AnimatePresence>
        {activeKey && popoverPos && (
          <DayPopover
            dayKey={activeKey}
            items={activeItems}
            pos={popoverPos}
            onClose={() => setActiveKey(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
