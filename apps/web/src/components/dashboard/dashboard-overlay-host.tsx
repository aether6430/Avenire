"use client";

import type { Route } from "next";
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import {
  clearWorkspaceSettingsOverlayRoute,
  parseRequestedSettingsTab,
} from "@/components/dashboard/dashboard-overlay-route-model";
import type { SettingsInitialUser } from "@/components/settings/settings-panel-model";
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
  initialWorkspaces?: Array<{
    logo: string | null;
    workspaceId: string;
    organizationId: string;
    rootFolderId: string;
    name: string;
  }>;
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

  return (
    <>
      {resolvedSettingsOpen ? (
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
                  clearWorkspaceSettingsOverlayRoute({
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
      {trashOpen && activeWorkspace?.workspaceId ? (
        <DeferredTrashDialog
          onOpenChange={setTrashOpen}
          open={trashOpen}
          workspaceUuid={activeWorkspace.workspaceId}
        />
      ) : null}
    </>
  );
}
