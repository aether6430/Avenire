"use client";

import { ScrollArea } from "@avenire/ui/components/scroll-area";
import { cn } from "@avenire/ui/lib/utils";
import { TaskEmptyState } from "@/components/tasks/task-empty-state";
import { TaskListRow } from "@/components/tasks/task-list-row";
import type { WorkspaceTask } from "@/lib/tasks";
import { getTaskGroupLabel } from "@/lib/tasks";

const KANBAN_STATUSES: WorkspaceTask["status"][] = [
  "planned",
  "drafting",
  "polishing",
  "completed",
];

export function TaskKanbanPane({
  draggedTaskId,
  dropStatus,
  groups,
  onDragEndTask,
  onDragStartTask,
  onDropStatus,
  onDragTargetChange,
  onSelectTask,
  onToggleComplete,
  selectedTaskId,
}: {
  draggedTaskId: string | null;
  dropStatus: WorkspaceTask["status"] | null;
  groups: Array<{ key: string; tasks: WorkspaceTask[] }>;
  onDragEndTask: () => void;
  onDragStartTask: (taskId: string) => void;
  onDropStatus: (taskId: string, status: WorkspaceTask["status"]) => void;
  onDragTargetChange: (status: WorkspaceTask["status"] | null) => void;
  onSelectTask: (taskId: string) => void;
  onToggleComplete: (task: WorkspaceTask) => void;
  selectedTaskId: string | null;
}) {
  const hasTasks = groups.some((group) => group.tasks.length > 0);

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div className="grid gap-4 p-4 xl:grid-cols-4">
        {!hasTasks ? (
          <div className="col-span-full">
            <TaskEmptyState
              description="Try a different filter, or create the first task for this workspace."
              title="No tasks match this view"
            />
          </div>
        ) : null}
        {KANBAN_STATUSES.map((status) => {
          const group = groups.find((entry) => entry.key === status);
          const tasks = group?.tasks ?? [];
          const isDropTarget = dropStatus === status;

          return (
            <section
              className={cn(
                "min-h-[24rem] rounded-2xl border border-border/70 bg-background/70 p-3 transition-colors",
                isDropTarget && "border-primary/40 bg-primary/5"
              )}
              key={status}
              onDragOver={(event) => {
                event.preventDefault();
                onDragTargetChange(status);
              }}
              onDragLeave={() => onDragTargetChange(null)}
              onDrop={(event) => {
                event.preventDefault();
                const taskId = event.dataTransfer.getData("text/task-id");
                if (taskId) {
                  onDropStatus(taskId, status);
                }
              }}
            >
              <div className="flex items-center justify-between border-border/60 border-b pb-3">
                <h2 className="font-medium text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                  {getTaskGroupLabel(status)}
                </h2>
                <span className="text-[11px] text-muted-foreground">
                  {tasks.length}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {tasks.map((task) => (
                  <TaskListRow
                    draggable
                    key={task.id}
                    layout="kanban"
                    onDragEnd={onDragEndTask}
                    onDragStart={onDragStartTask}
                    onSelect={() => onSelectTask(task.id)}
                    onToggleComplete={() => onToggleComplete(task)}
                    selected={selectedTaskId === task.id}
                    task={task}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </ScrollArea>
  );
}
