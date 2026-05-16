"use client";

import dynamic from "next/dynamic";
import { useWorkspaceBootstrap } from "@/components/dashboard/workspace-bootstrap";
import { WorkspaceRoutePlaceholder } from "@/components/dashboard/workspace-route-placeholder";
import type { TasksWorkspaceProps } from "@/components/tasks/tasks-workspace-model";

const TasksWorkspace = dynamic<TasksWorkspaceProps>(
  () =>
    import("@/components/tasks/tasks-workspace").then(
      (module) => module.TasksWorkspace
    ),
  {
    loading: () => <WorkspaceRoutePlaceholder label="Loading tasks..." />,
    ssr: false,
  }
);

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
    <TasksWorkspace
      currentUserAvatar={user.image ?? undefined}
      currentUserEmail={user.email}
      currentUserId={user.id}
      currentUserName={user.name ?? undefined}
      workspaceId={workspace.workspaceId}
    />
  );
}
