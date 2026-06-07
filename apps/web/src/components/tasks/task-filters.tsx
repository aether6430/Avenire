"use client";

import { Input } from "@avenire/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@avenire/ui/components/select";
import { Tabs, TabsList, TabsTrigger } from "@avenire/ui/components/tabs";
import type {
  TaskGrouping,
  TaskStatusFilter,
  TaskViewMode,
} from "@/components/tasks/types";
import type { WorkspaceMemberOption } from "@/lib/tasks";

export function TaskFilters({
  assigneeFilter,
  grouping,
  members,
  onAssigneeFilterChange,
  onGroupingChange,
  onViewModeChange,
  onSearchQueryChange,
  onStatusFilterChange,
  searchQuery,
  statusFilter,
  viewMode,
}: {
  assigneeFilter: string;
  grouping: TaskGrouping;
  members: WorkspaceMemberOption[];
  onAssigneeFilterChange: (value: string) => void;
  onGroupingChange: (value: TaskGrouping) => void;
  onViewModeChange: (value: TaskViewMode) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatusFilter) => void;
  searchQuery: string;
  statusFilter: TaskStatusFilter;
  viewMode: TaskViewMode;
}) {
  const memberOptions = members.filter(
    (member): member is WorkspaceMemberOption & { userId: string } =>
      typeof member.userId === "string" && member.userId.length > 0
  );

  return (
    <div className="flex flex-col gap-2 border-border/70 border-b px-1 py-2 md:flex-row md:items-center md:gap-3 md:px-4 md:py-3">
      <Tabs
        onValueChange={(value) => onViewModeChange(value as TaskViewMode)}
        value={viewMode}
      >
        <TabsList className="h-8 w-full md:w-auto" variant="line">
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="kanban">Kanban</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        className="hidden h-8 flex-1 text-xs"
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search tasks..."
        value={searchQuery}
      />
      <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-0.5 md:flex-wrap md:gap-2 md:overflow-visible md:pb-0">
        <Select
          onValueChange={(value) =>
            onStatusFilterChange(value as TaskStatusFilter)
          }
          value={statusFilter}
        >
          <SelectTrigger className="h-8 shrink-0 text-xs">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="planned">Planned</SelectItem>
            <SelectItem value="drafting">Drafting</SelectItem>
            <SelectItem value="polishing">Polishing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => onAssigneeFilterChange(value ?? "all")}
          value={assigneeFilter}
        >
          <SelectTrigger className="h-8 shrink-0 text-xs">
            <SelectValue placeholder="Assignee" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="all">All assignees</SelectItem>
            {memberOptions.map((member) => (
              <SelectItem key={member.userId} value={member.userId}>
                {member.name ?? member.email ?? "Member"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {viewMode === "list" ? (
          <Select
            onValueChange={(value) => onGroupingChange(value as TaskGrouping)}
            value={grouping}
          >
            <SelectTrigger className="h-8 shrink-0 text-xs">
              <SelectValue placeholder="Group by" />
            </SelectTrigger>
            <SelectContent align="end">
              <SelectItem value="status">Group by status</SelectItem>
              <SelectItem value="due">Group by due date</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
      </div>
    </div>
  );
}
