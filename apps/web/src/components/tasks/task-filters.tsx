"use client";

import { Input } from "@avenire/ui/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@avenire/ui/components/select";
import type { WorkspaceMemberOption } from "@/lib/tasks";
import type { TaskGrouping, TaskStatusFilter } from "@/components/tasks/types";

export function TaskFilters({
  assigneeFilter,
  grouping,
  members,
  onAssigneeFilterChange,
  onGroupingChange,
  onSearchQueryChange,
  onStatusFilterChange,
  searchQuery,
  statusFilter,
}: {
  assigneeFilter: string;
  grouping: TaskGrouping;
  members: WorkspaceMemberOption[];
  onAssigneeFilterChange: (value: string) => void;
  onGroupingChange: (value: TaskGrouping) => void;
  onSearchQueryChange: (value: string) => void;
  onStatusFilterChange: (value: TaskStatusFilter) => void;
  searchQuery: string;
  statusFilter: TaskStatusFilter;
}) {
  const memberOptions = members.filter(
    (member): member is WorkspaceMemberOption & { userId: string } =>
      typeof member.userId === "string" && member.userId.length > 0
  );

  return (
    <div className="flex flex-col gap-2 border-border/70 border-b px-4 py-3 md:flex-row md:items-center">
      <Input
        className="h-8 flex-1 text-xs"
        onChange={(event) => onSearchQueryChange(event.target.value)}
        placeholder="Search tasks..."
        value={searchQuery}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Select onValueChange={(value) => onStatusFilterChange(value as TaskStatusFilter)} value={statusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">To do</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(value) => onAssigneeFilterChange(value ?? "all")}
          value={assigneeFilter}
        >
          <SelectTrigger>
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
        <Select onValueChange={(value) => onGroupingChange(value as TaskGrouping)} value={grouping}>
          <SelectTrigger>
            <SelectValue placeholder="Group by" />
          </SelectTrigger>
          <SelectContent align="end">
            <SelectItem value="status">Group by status</SelectItem>
            <SelectItem value="due">Group by due date</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
