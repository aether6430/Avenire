"use client";

import { ListChecks as ListTodo } from "@phosphor-icons/react";
import { BookOpen } from "@phosphor-icons/react/BookOpen";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import type {
  RevisionItem,
  StudentCalendarPopoverPos,
  UpcomingTask,
} from "@/components/student-calendar-model";
import { formatTaskDue } from "@/components/student-calendar-model";

export function DayPopover({
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
              delay: 0.04 + idx * 0.04,
              damping: 28,
              stiffness: 400,
              type: "spring",
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
