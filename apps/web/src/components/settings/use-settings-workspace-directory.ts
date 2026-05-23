"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  TabKey,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import {
  createWorkspaceByName,
  deleteWorkspaceById,
  loadWorkspacesList,
} from "@/components/settings/settings-workspace-client";

export function useSettingsWorkspaceDirectory({
  currentTab,
  initialWorkspaceId,
  initialWorkspaces,
  refreshSudoStatus,
  requestSudoForAction,
}: {
  currentTab: TabKey;
  initialWorkspaceId?: string;
  initialWorkspaces?: WorkspaceSummary[];
  refreshSudoStatus: () => Promise<void>;
  requestSudoForAction: (
    actionLabel: string,
    action: () => Promise<void>
  ) => void;
}) {
  const [workspaces, setWorkspaces] = useState(initialWorkspaces ?? []);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(
    initialWorkspaceId ?? initialWorkspaces?.[0]?.workspaceId ?? ""
  );
  const [workspacesErrorMessage, setWorkspacesErrorMessage] = useState<
    string | null
  >(null);
  const [workspaceStatus, setWorkspaceStatus] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [workspacesLoadFailed, setWorkspacesLoadFailed] = useState(false);
  const [workspacesLoading, setWorkspacesLoading] = useState(false);
  const [workspaceDeleteConfirm, setWorkspaceDeleteConfirm] = useState("");
  const workspaceLoadedRef = useRef(false);

  const selectedWorkspace = useMemo(
    () =>
      workspaces.find(
        (workspace) => workspace.workspaceId === activeWorkspaceId
      ) ?? null,
    [activeWorkspaceId, workspaces]
  );

  const refreshWorkspaces = useCallback(async () => {
    setWorkspacesLoading(true);
    setWorkspacesLoadFailed(false);
    setWorkspacesErrorMessage(null);
    try {
      const nextWorkspaces = await loadWorkspacesList();
      setWorkspaces(nextWorkspaces);
      setWorkspacesErrorMessage(null);
      setWorkspacesLoadFailed(false);
      if (
        !nextWorkspaces.some(
          (workspace) => workspace.workspaceId === activeWorkspaceId
        )
      ) {
        setActiveWorkspaceId(nextWorkspaces[0]?.workspaceId ?? "");
      }
    } catch (error) {
      setWorkspacesErrorMessage(
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : "Unable to load workspaces."
      );
      setWorkspacesLoadFailed(true);
    } finally {
      setWorkspacesLoading(false);
    }
  }, [activeWorkspaceId]);

  useEffect(() => {
    if (currentTab !== "workspace") {
      return;
    }

    if (!workspaceLoadedRef.current) {
      workspaceLoadedRef.current = true;
      if (workspaces.length === 0) {
        void refreshWorkspaces();
      }
      void refreshSudoStatus();
    }
  }, [currentTab, refreshSudoStatus, refreshWorkspaces, workspaces.length]);

  const createWorkspace = async () => {
    setIsCreatingWorkspace(true);
    try {
      await createWorkspaceByName(workspaceName.trim());
      setWorkspaceStatus("Workspace created.");
      setWorkspaceName("");
      await refreshWorkspaces();
    } catch (error) {
      setWorkspaceStatus(
        error instanceof Error ? error.message : "Unable to create workspace."
      );
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const runDeleteWorkspace = async () => {
    if (!selectedWorkspace) {
      return;
    }

    setWorkspaceStatus("Deleting workspace...");

    try {
      const result = await deleteWorkspaceById(selectedWorkspace.workspaceId);

      if (result.status === "sudo_required") {
        setWorkspaceStatus(result.error);
        requestSudoForAction(
          `delete ${selectedWorkspace.name}`,
          runDeleteWorkspace
        );
        return;
      }

      setWorkspaces(result.workspaces);
      setWorkspaceDeleteConfirm("");
      if (result.workspaces.length > 0) {
        setActiveWorkspaceId(result.workspaces[0].workspaceId);
      } else {
        setActiveWorkspaceId("");
      }
      setWorkspaceStatus("Workspace deleted.");
    } catch (error) {
      setWorkspaceStatus(
        error instanceof Error ? error.message : "Unable to delete workspace."
      );
    }
  };

  const selectedWorkspaceInitial = (
    selectedWorkspace?.name?.trim().charAt(0) || "A"
  ).toUpperCase();

  return {
    activeWorkspaceId,
    createWorkspace,
    isCreatingWorkspace,
    refreshWorkspaces,
    runDeleteWorkspace,
    selectedWorkspace,
    selectedWorkspaceInitial,
    setActiveWorkspaceId,
    setIsCreatingWorkspace,
    setWorkspaceDeleteConfirm,
    setWorkspaceName,
    setWorkspaceStatus,
    workspaceDeleteConfirm,
    workspaceName,
    workspaceStatus,
    workspaces,
    workspacesErrorMessage,
    workspacesLoadFailed,
    workspacesLoading,
  };
}
