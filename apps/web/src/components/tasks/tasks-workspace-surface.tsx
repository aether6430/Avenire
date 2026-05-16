"use client";

import { Button } from "@avenire/ui/components/button";
import { Spinner } from "@avenire/ui/components/spinner";
import { ListChecks, Plus } from "@phosphor-icons/react";
import {
  HeaderActions,
  HeaderBreadcrumbs,
  HeaderLeadingIcon,
  HeaderTitle,
} from "@/components/dashboard/header-portal";
import { TaskEmptyState } from "@/components/tasks/task-empty-state";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskKanbanPane } from "@/components/tasks/task-kanban-pane";
import { TaskListPane } from "@/components/tasks/task-list-pane";
import { TaskMobileSheet } from "@/components/tasks/task-mobile-sheet";
import { getTasksWorkspaceSurfaceState } from "@/components/tasks/tasks-workspace-model";
import type { TasksWorkspaceRuntime } from "@/components/tasks/use-tasks-workspace";

export function TasksWorkspaceSurface({
  runtime,
}: {
  runtime: TasksWorkspaceRuntime;
}) {
  const workspaceSurfaceState = getTasksWorkspaceSurfaceState({
    loadFailed: runtime.loadFailed,
    loading: runtime.loading,
    visibleTaskCount: runtime.tasks.length,
  });
  const headerActions = (
    <div className="flex items-center gap-2">
      <Button onClick={runtime.handleCreateTask} type="button">
        <Plus className="size-3.5" />
        New Task
      </Button>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-background">
      <HeaderTitle>Tasks</HeaderTitle>
      <HeaderLeadingIcon>
        <ListChecks className="size-3.5" />
      </HeaderLeadingIcon>
      <HeaderBreadcrumbs>
        <div className="min-w-0">
          <p className="truncate font-medium text-foreground text-sm">Tasks</p>
        </div>
      </HeaderBreadcrumbs>
      <HeaderActions>{headerActions}</HeaderActions>

      <div className="flex w-full flex-col gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="flex flex-col gap-1">
          <h1 className="font-semibold text-foreground text-xl tracking-tight">
            Tasks
          </h1>
          <p className="text-muted-foreground text-sm">
            Assigned, scheduled, and in progress across the current workspace.
          </p>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden border-border/70 border-t">
          <TaskFilters
            assigneeFilter={runtime.assigneeFilter}
            grouping={runtime.grouping}
            members={runtime.members}
            onAssigneeFilterChange={runtime.setAssigneeFilter}
            onGroupingChange={runtime.setGrouping}
            onSearchQueryChange={runtime.setSearchQuery}
            onStatusFilterChange={runtime.setStatusFilter}
            onViewModeChange={runtime.setViewMode}
            searchQuery={runtime.searchQuery}
            statusFilter={runtime.statusFilter}
            viewMode={runtime.viewMode}
          />
          {workspaceSurfaceState?.showSpinner ? (
            <div className="flex min-h-[18rem] items-center justify-center text-muted-foreground text-sm">
              <Spinner className="mr-2 size-4" />
              {workspaceSurfaceState.title}
            </div>
          ) : workspaceSurfaceState ? (
            <TaskEmptyState
              description={workspaceSurfaceState.description ?? ""}
              title={workspaceSurfaceState.title}
            />
          ) : runtime.viewMode === "kanban" ? (
            <TaskKanbanPane
              draggedTaskId={runtime.draggedTaskId}
              dropStatus={runtime.dropStatus}
              groups={runtime.kanbanGroups}
              onDragEndTask={runtime.handleDragEndTask}
              onDragStartTask={runtime.handleDragStartTask}
              onDragTargetChange={runtime.setDropStatus}
              onDropStatus={runtime.handleDropStatus}
              onSelectTask={runtime.handleSelectTask}
              onToggleComplete={runtime.toggleTaskComplete}
              selectedTaskId={runtime.selectedTaskId}
            />
          ) : (
            <TaskListPane
              draggedTaskId={runtime.draggedTaskId}
              groups={runtime.groupedTasks}
              onDragEndTask={runtime.handleDragEndTask}
              onDragStartTask={runtime.handleDragStartTask}
              onDragTargetChange={runtime.setDropStatus}
              onDropStatus={runtime.handleDropStatus}
              onSelectTask={runtime.handleSelectTask}
              onToggleComplete={runtime.toggleTaskComplete}
              selectedTaskId={runtime.selectedTaskId}
            />
          )}
        </div>
      </div>

      <TaskMobileSheet
        draft={runtime.draft}
        isDirty={runtime.isDirty}
        isOpen={runtime.sheetOpen && runtime.mode !== "idle"}
        isSaving={runtime.isSaving}
        members={runtime.members}
        mode={runtime.mode}
        onDelete={runtime.handleDelete}
        onDraftChange={(updates) =>
          runtime.setDraft((current) =>
            current ? { ...current, ...updates } : current
          )
        }
        onOpenChange={runtime.handleSheetOpenChange}
        onReset={runtime.handleReset}
        onSave={runtime.handleSave}
        onToggleComplete={() => {
          if (runtime.selectedTask) {
            void runtime.toggleTaskComplete(runtime.selectedTask);
          }
        }}
        task={runtime.selectedTask}
        workspaceUuid={runtime.workspaceId}
      />
    </div>
  );
}
