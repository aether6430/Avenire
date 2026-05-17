"use client";

import { Badge } from "@avenire/ui/components/badge";
import { cn } from "@avenire/ui/lib/utils";
import { ListChecks as ListTodo } from "@phosphor-icons/react";
import { BookOpen } from "@phosphor-icons/react/BookOpen";
import type { MouseEvent as ReactMouseEvent } from "react";
import type {
  RevisionItem,
  UpcomingTask,
} from "@/components/student-calendar-model";

export function DesktopDayCell({
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
                  +{taskOverflow} tasks
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </button>
  );
}
