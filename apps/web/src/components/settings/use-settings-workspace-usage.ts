"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  TabKey,
  WorkspaceUsage,
} from "@/components/settings/settings-panel-model";
import { loadWorkspaceUsage } from "@/components/settings/settings-workspace-client";

export function useSettingsWorkspaceUsage({
  activeWorkspaceId,
  currentTab,
  refreshSudoStatus,
}: {
  activeWorkspaceId: string;
  currentTab: TabKey;
  refreshSudoStatus: () => Promise<void>;
}) {
  const [workspaceUsage, setWorkspaceUsage] = useState<WorkspaceUsage | null>(
    null
  );
  const [workspaceUsageLoadFailed, setWorkspaceUsageLoadFailed] =
    useState(false);
  const [workspaceUsageLoading, setWorkspaceUsageLoading] = useState(false);
  const [workspaceUsageStatus, setWorkspaceUsageStatus] = useState<
    string | null
  >(null);
  const workspaceUsageLoadedForRef = useRef<string>("");

  const refreshWorkspaceUsage = useCallback(
    async (workspaceId: string, showLoading = false) => {
      setWorkspaceUsageLoading(showLoading);
      setWorkspaceUsageLoadFailed(false);
      if (showLoading) {
        setWorkspaceUsageStatus("Loading workspace stats...");
      }

      try {
        setWorkspaceUsage(await loadWorkspaceUsage(workspaceId));
        setWorkspaceUsageLoadFailed(false);
        if (showLoading) {
          setWorkspaceUsageStatus(null);
        }
      } catch (error) {
        setWorkspaceUsage(null);
        setWorkspaceUsageLoadFailed(true);
        setWorkspaceUsageStatus(
          error instanceof Error
            ? error.message
            : "Unable to load workspace stats."
        );
      } finally {
        setWorkspaceUsageLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (currentTab !== "workspace") {
      return;
    }

    if (
      activeWorkspaceId &&
      workspaceUsageLoadedForRef.current !== activeWorkspaceId
    ) {
      workspaceUsageLoadedForRef.current = activeWorkspaceId;
      void refreshWorkspaceUsage(activeWorkspaceId, true);
      void refreshSudoStatus();
    }
  }, [activeWorkspaceId, currentTab, refreshSudoStatus, refreshWorkspaceUsage]);

  return {
    refreshWorkspaceUsage,
    workspaceUsage,
    workspaceUsageLoadFailed,
    workspaceUsageLoading,
    workspaceUsageStatus,
  };
}
