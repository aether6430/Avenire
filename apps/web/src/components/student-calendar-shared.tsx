"use client";

import { cn } from "@avenire/ui/lib/utils";
import { BookOpen, ListChecks as ListTodo, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  formatSheetDate,
  formatTaskDue,
  type RevisionItem,
  type UpcomingTask,
} from "@/components/student-calendar-model";

export function StudentCalendarDayPills({
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

export function StudentCalendarDaySheet({
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
            Mindset Sets
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

export function studentCalendarTodayBadgeClasses(
  isToday: boolean,
  isSelected: boolean
) {
  return cn(
    "flex h-[26px] w-[26px] items-center justify-center rounded-full text-[13px] leading-none transition-colors",
    isToday && !isSelected && "font-semibold text-primary",
    isSelected && "bg-primary font-semibold text-primary-foreground",
    !(isToday || isSelected) && "font-normal text-foreground/80"
  );
}
