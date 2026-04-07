"use client";

import { TasksWorkspace } from "@/components/tasks/tasks-workspace";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";

export function WorkspaceTasksPageClient() {
  const { status, user, workspace } = useWorkspaceBootstrap();

  if (!(status === "ready" && user && workspace)) {
    return <WorkspaceRoutePlaceholder label="Loading tasks..." />;
  }

  return (
    <TasksWorkspace
      currentUserAvatar={user.image ?? undefined}
      currentUserEmail={user.email}
      currentUserId={user.id}
      currentUserName={user.name ?? undefined}
      workspaceId={workspace.workspaceId}
    />
  );
}
