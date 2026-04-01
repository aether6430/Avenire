"use client";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { ListChecks } from "@phosphor-icons/react";
import type { Route } from "next";
import { useSyncExternalStore } from "react";
import { formatTaskDueDate, getTaskStatusLabel } from "@/lib/tasks";
import {
  getTaskStoreSnapshot,
  sortWorkspaceTasks,
  subscribeToTaskStore,
} from "@/lib/task-client-store";

function SectionButton({
  label,
  onClick,
}: {
  label: string;
  onClick?: () => void;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton onClick={onClick} size="default">
        <ListChecks className="size-4" />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-xs">{label}</p>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function SidebarTaskPreview({
  activeWorkspaceId,
  closeMobileSidebar,
  navigate,
}: {
  activeWorkspaceId?: string | null;
  closeMobileSidebar: () => void;
  navigate: (href: Route) => void;
}) {
  const { tasks: sidebarTasks } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const visibleTasks = sortWorkspaceTasks(
    sidebarTasks.filter(
      (task) =>
        task.workspaceId === activeWorkspaceId && task.status !== "completed"
    )
  );
  const dueTasks = visibleTasks.filter(
    (task) => task.dueAt && new Date(task.dueAt) <= endOfToday
  );
  const upcomingTasks = visibleTasks.filter((task) =>
    task.dueAt ? new Date(task.dueAt) > now : false
  );

  const renderTaskItems = (
    tasks: typeof visibleTasks,
    emptyLabel: string
  ) =>
    tasks.length > 0 ? (
      <SidebarMenu className="space-y-1">
        {tasks.slice(0, 6).map((task) => (
          <SidebarMenuItem key={task.id}>
            <SidebarMenuButton
              className="h-auto flex-col items-start gap-1 px-2 py-2"
              onClick={() => {
                closeMobileSidebar();
                navigate(`/workspace/tasks?task=${task.id}` as Route);
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span className="truncate text-left text-xs font-medium">
                  {task.title}
                </span>
                <span className="shrink-0 rounded-sm border border-border/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {getTaskStatusLabel(task.status)}
                </span>
              </div>
              <div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
                <span className="truncate">
                  {task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}
                </span>
                <span className="shrink-0">
                  {formatTaskDueDate(task.dueAt)}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    ) : (
      <p className="px-2 py-2 text-muted-foreground text-xs">{emptyLabel}</p>
    );

  return (
    <div className="absolute inset-0 overflow-y-auto px-2 py-2">
      <SidebarGroup>
        <SidebarGroupLabel>Tasks</SidebarGroupLabel>
        <SidebarGroupContent>
          <p className="px-2 pb-2 text-muted-foreground text-xs leading-relaxed">
            Open the task workspace for assignment, scheduling, and inline detail
            editing.
          </p>
          <SidebarMenu>
            <SectionButton
              label="Open Tasks"
              onClick={() => {
                closeMobileSidebar();
                navigate("/workspace/tasks" as Route);
              }}
            />
          </SidebarMenu>
          <SidebarGroup className="mt-3">
            <SidebarGroupLabel>Due tasks</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderTaskItems(dueTasks, "Nothing is due right now.")}
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarGroup className="mt-3">
            <SidebarGroupLabel>Upcoming tasks</SidebarGroupLabel>
            <SidebarGroupContent>
              {renderTaskItems(
                upcomingTasks,
                "No upcoming tasks have due dates yet."
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  );
}
