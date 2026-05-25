"use client";

import type { Route } from "next";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import type {
  SettingsInitialUser,
  WorkspaceSummary,
} from "@/components/settings/settings-panel-model";
import { useDeferredPresence } from "@/hooks/use-deferred-presence";
import {
  clearSettingsOverlayRoute,
  parseRequestedSettingsTab,
} from "@/lib/settings-overlay-route";
import { useDashboardOverlayStore } from "@/stores/dashboardOverlayStore";

const DeferredSettingsDialog = dynamic(
  () =>
    import("@/components/settings/settings-dialog").then((module) => ({
      default: module.SettingsDialog,
    })),
  { loading: () => null }
);

const DeferredTrashDialog = dynamic(
  () =>
    import("@/components/dashboard/trash-dialog").then((module) => ({
      default: module.TrashDialog,
    })),
  { loading: () => null }
);

export function DashboardOverlayHost({
  activeWorkspace,
  initialUser,
  initialWorkspaces,
}: {
  activeWorkspace?: {
    name?: string;
    organizationId?: string | null;
    rootFolderId: string;
    workspaceId: string;
  } | null;
  initialUser?: SettingsInitialUser | null;
  initialWorkspaces?: WorkspaceSummary[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const settingsOpen = useDashboardOverlayStore((state) => state.settingsOpen);
  const settingsTab = useDashboardOverlayStore((state) => state.settingsTab);
  const setSettingsOpen = useDashboardOverlayStore(
    (state) => state.setSettingsOpen
  );
  const setSettingsTab = useDashboardOverlayStore(
    (state) => state.setSettingsTab
  );
  const trashOpen = useDashboardOverlayStore((state) => state.trashOpen);
  const setTrashOpen = useDashboardOverlayStore((state) => state.setTrashOpen);
  const settingsRequestedFromRoute = searchParams.get("overlay") === "settings";
  const requestedSettingsTab = useMemo(
    () => parseRequestedSettingsTab(searchParams.get("settingsTab")),
    [searchParams]
  );
  const resolvedSettingsOpen = settingsOpen || settingsRequestedFromRoute;
  const resolvedSettingsTab = requestedSettingsTab ?? settingsTab ?? "account";
  const trashDialogOpen = trashOpen && Boolean(activeWorkspace?.workspaceId);
  const renderSettingsDialog = useDeferredPresence(resolvedSettingsOpen);
  const renderTrashDialog = useDeferredPresence(trashDialogOpen);

  return (
    <>
      {renderSettingsDialog ? (
        <DeferredSettingsDialog
          initialTab={resolvedSettingsTab}
          initialUser={initialUser}
          initialWorkspaceId={activeWorkspace?.workspaceId}
          initialWorkspaces={initialWorkspaces}
          onOpenChange={(open) => {
            setSettingsOpen(open);
            if (!open) {
              setSettingsTab(null);
              if (
                settingsRequestedFromRoute ||
                searchParams.has("settingsTab")
              ) {
                router.replace(
                  clearSettingsOverlayRoute({
                    pathname,
                    searchParams,
                  }) as Route
                );
              }
              return;
            }

            setSettingsTab(resolvedSettingsTab);
          }}
          open={resolvedSettingsOpen}
        />
      ) : null}
      {renderTrashDialog ? (
        <DeferredTrashDialog
          onOpenChange={setTrashOpen}
          open={trashDialogOpen}
          workspaceUuid={activeWorkspace?.workspaceId ?? null}
        />
      ) : null}
    </>
  );
}
