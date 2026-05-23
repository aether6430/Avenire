"use client";

import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import type { TasksWorkspaceProps } from "@/components/tasks/tasks-workspace-model";
import { TasksWorkspaceSurface } from "@/components/tasks/tasks-workspace-surface";
import { useTasksWorkspace } from "@/components/tasks/use-tasks-workspace";

function ReadyTasksWorkspace(props: TasksWorkspaceProps) {
  const runtime = useTasksWorkspace(props);

  return <TasksWorkspaceSurface runtime={runtime} />;
}

export function WorkspaceTasksPageClient() {
  const { status, user, workspace } = useWorkspaceBootstrap();

  if (status === "error") {
    return (
      <WorkspaceRoutePlaceholder
        label="Unable to load tasks."
        pending={false}
      />
    );
  }

  if (status === "ready" && user && !workspace) {
    return (
      <WorkspaceRoutePlaceholder
        label="Create a workspace to continue."
        pending={false}
      />
    );
  }

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading tasks..." />;
  }

  return (
    <ReadyTasksWorkspace
      currentUserAvatar={user.image ?? undefined}
      currentUserEmail={user.email}
      currentUserId={user.id}
      currentUserName={user.name ?? undefined}
      workspaceId={workspace.workspaceId}
    />
  );
}
