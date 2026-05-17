"use client";

import { TasksWorkspaceSurface } from "@/components/tasks/tasks-workspace-surface";
import type { TasksWorkspaceProps } from "@/components/tasks/tasks-workspace-model";
import { useTasksWorkspace } from "@/components/tasks/use-tasks-workspace";

export function TasksWorkspace(props: TasksWorkspaceProps) {
  const runtime = useTasksWorkspace(props);

  return <TasksWorkspaceSurface runtime={runtime} />;
}
