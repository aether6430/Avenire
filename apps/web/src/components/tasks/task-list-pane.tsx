"use client";

import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import { TaskEmptyState } from "@/components/tasks/task-empty-state";
import { TaskListRow } from "@/components/tasks/task-list-row";
import type { WorkspaceTask } from "@/lib/tasks";

export function TaskListPane({
  groups,
  onSelectTask,
  onToggleComplete,
  selectedTaskId,
}: {
  groups: Array<{ key: string; label: string; tasks: WorkspaceTask[] }>;
  onSelectTask: (taskId: string) => void;
  onToggleComplete: (task: WorkspaceTask) => void;
  selectedTaskId: string | null;
}) {
  const hasTasks = groups.some((group) => group.tasks.length > 0);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="space-y-5 p-4">
        {!hasTasks ? (
          <TaskEmptyState
            description="Try a different filter, or create the first task for this workspace."
            title="No tasks match this view"
          />
        ) : null}
        {groups.map((group) =>
          group.tasks.length > 0 ? (
            <section className="space-y-2" key={group.key}>
              <div className="flex items-center justify-between px-2">
                <h2 className="font-medium text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {group.label}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {group.tasks.length}
                </span>
              </div>
              <div className={cn("space-y-1")}>
                {group.tasks.map((task) => (
                  <TaskListRow
                    key={task.id}
                    onSelect={() => onSelectTask(task.id)}
                    onToggleComplete={() => onToggleComplete(task)}
                    selected={selectedTaskId === task.id}
                    task={task}
                  />
                ))}
              </div>
            </section>
          ) : null
        )}
      </div>
    </ScrollArea>
  );
}
