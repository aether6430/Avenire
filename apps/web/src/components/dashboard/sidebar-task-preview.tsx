"use client";

import { Button } from "@avenire/ui/components/button";
import { Input } from "@avenire/ui/components/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@avenire/ui/components/sidebar";
import { ListChecks, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import type { Route } from "next";
import { useMemo, useState, useSyncExternalStore } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const { tasks: sidebarTasks } = useSyncExternalStore(
    subscribeToTaskStore,
    getTaskStoreSnapshot,
    getTaskStoreSnapshot
  );

  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const visibleTasks = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return sortWorkspaceTasks(
      sidebarTasks.filter((task) => {
        if (
          task.workspaceId !== activeWorkspaceId ||
          task.status === "completed"
        ) {
          return false;
        }

        if (!needle) {
          return true;
        }

        return `${task.title} ${task.description ?? ""} ${task.assignee?.name ?? ""}`
          .toLowerCase()
          .includes(needle);
      })
    );
  }, [activeWorkspaceId, searchQuery, sidebarTasks]);
  const dueTasks = visibleTasks.filter(
    (task) => task.dueAt && new Date(task.dueAt) <= endOfToday
  );
  const upcomingTasks = visibleTasks.filter((task) =>
    task.dueAt ? new Date(task.dueAt) > now : false
  );

  const renderTaskItems = (tasks: typeof visibleTasks, emptyLabel: string) =>
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
        <div className="flex items-center justify-between gap-2">
          <SidebarGroupLabel>Tasks</SidebarGroupLabel>
          <div className="flex items-center gap-1">
            <Button
              className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
              onClick={() => {
                closeMobileSidebar();
                navigate("/workspace/tasks" as Route);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <MagnifyingGlass className="size-3.5" />
            </Button>
            <Button
              className="h-7 w-7 rounded-md border border-border/60 bg-background/60 p-0 text-muted-foreground shadow-none hover:bg-muted"
              onClick={() => {
                closeMobileSidebar();
                navigate("/workspace/tasks" as Route);
              }}
              size="icon"
              type="button"
              variant="ghost"
            >
              <Plus className="size-3.5" />
            </Button>
          </div>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            <SectionButton
              label="Open Tasks"
              onClick={() => {
                closeMobileSidebar();
                navigate("/workspace/tasks" as Route);
              }}
            />
          </SidebarMenu>
          <Input
            className="mt-2 h-8"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search tasks..."
            value={searchQuery}
          />
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
