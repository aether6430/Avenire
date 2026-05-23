import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SettingsWorkspaceSection } from "@/components/settings/settings-workspace-section";
import type { SettingsPanelRuntime } from "@/components/settings/use-settings-panel";

function createRuntime(
  overrides: Partial<SettingsPanelRuntime> = {}
): SettingsPanelRuntime {
  return {
    activeWorkspaceId: "workspace-1",
    createWorkspace: async () => {},
    currentTab: "workspace",
    currentUserEmail: "owner@example.com",
    deleteSelectedWorkspace: async () => {},
    handleWorkspaceIconFileChange: async () => {},
    inviteWorkspaceMember: async () => {},
    isCreatingWorkspace: false,
    isInvitingMember: false,
    privacyMode: false,
    removeWorkspaceMember: async () => {},
    saveWorkspaceIcon: async () => false,
    searchParams: new URLSearchParams(),
    selectedWorkspace: {
      logo: null,
      name: "Alpha",
      organizationId: "org-1",
      rootFolderId: "root-1",
      workspaceId: "workspace-1",
    },
    selectedWorkspaceInitial: "A",
    selectedWorkspaceMemberCount: 0,
    session: null,
    setActiveWorkspaceId: () => {},
    setTheme: () => {},
    setWorkspaceDeleteConfirm: () => {},
    setWorkspaceEmail: () => {},
    setWorkspaceIconDraft: () => {},
    setWorkspaceName: () => {},
    setWorkspaceStatus: () => {},
    theme: "dark",
    workspaceDeleteConfirm: "",
    workspaceEmail: "",
    workspaceIconDraft: "",
    workspaceIconInputRef: { current: null },
    workspaceIconStatus: null,
    workspaceIconUploading: false,
    workspaceMembers: [],
    workspaceMembersErrorMessage: null,
    workspaceMembersLoadFailed: false,
    workspaceMembersLoading: false,
    workspaceName: "",
    workspaceStatus: null,
    workspacesErrorMessage: null,
    workspacesLoadFailed: false,
    workspacesLoading: false,
    workspaceUsageLoadFailed: false,
    workspaceUsageLoading: false,
    workspaceUsage: null,
    workspaceUsageStatus: null,
    workspaces: [],
    ...overrides,
  } as unknown as SettingsPanelRuntime;
}

const settingsPanelContentFile = resolve(
  import.meta.dirname,
  "./settings-panel-content.tsx"
);
const workspaceDirectoryHookFile = resolve(
  import.meta.dirname,
  "./use-settings-workspace-directory.ts"
);
const removedWrapperFile = resolve(
  import.meta.dirname,
  "./settings-workspace-tab-shell.tsx"
);

describe("SettingsWorkspaceSection", () => {
  it("renders an explicit loading state while workspace members are still resolving", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({ workspaceMembersLoading: true })}
      />
    );

    expect(html).toContain("Loading workspace members...");
    expect(html).not.toContain("No members found.");
  });

  it("renders an explicit error when workspace members fail to load", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({
          workspaceMembersErrorMessage: "members backend offline",
          workspaceMembersLoadFailed: true,
        })}
      />
    );

    expect(html).toContain("members backend offline");
    expect(html).not.toContain("No members found.");
  });

  it("keeps the empty state for workspaces that truly have no members", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection runtime={createRuntime()} />
    );

    expect(html).toContain("No members found.");
  });

  it("renders explicit unavailable workspace stats instead of a loading spinner after a usage failure", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({
          workspaceUsageLoadFailed: true,
          workspaceUsageStatus: "Unable to load workspace stats.",
        })}
      />
    );

    expect(html).toContain("Unable to load workspace stats.");
    expect(html.match(/Unavailable/g)?.length).toBe(4);
  });

  it("labels the workspace file-count card as Files instead of the older Manage wording", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({
          workspaceUsage: {
            fileCount: 42,
            folderCount: 7,
            indexedFileCount: 19,
            memberCount: 5,
            pendingIngestionCount: 3,
            totalSizeBytes: 2048,
          },
        })}
      />
    );

    expect(html).toContain("Files");
    expect(html).toContain("Files available in this workspace.");
    expect(html).not.toContain(">Manage<");
    expect(html).not.toContain("Manage records available in this workspace.");
  });

  it("renders an explicit loading state while the workspace list is still resolving", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({
          selectedWorkspace: null,
          workspaces: [],
          workspacesLoading: true,
        })}
      />
    );

    expect(html).toContain("Loading workspaces...");
    expect(html).not.toContain("No workspaces yet.");
  });

  it("renders an explicit error when the workspace list fails to load", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({
          selectedWorkspace: null,
          workspaces: [],
          workspacesErrorMessage: "workspace directory offline",
          workspacesLoadFailed: true,
        })}
      />
    );

    expect(html).toContain("workspace directory offline");
    expect(html).not.toContain("No workspaces yet.");
  });

  it("renders the real empty workspace copy only when no workspaces exist and the list has loaded", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceSection
        runtime={createRuntime({
          selectedWorkspace: null,
          workspaces: [],
          workspacesLoadFailed: false,
          workspacesLoading: false,
        })}
      />
    );

    expect(html).toContain("No workspaces yet.");
    expect(html.match(/No workspaces yet\./g)?.length).toBe(2);
    expect(html).not.toContain(
      "Select a workspace to inspect its storage and members."
    );
    expect(html).not.toContain("Loading workspaces...");
    expect(html).not.toContain("Unable to load workspaces.");
  });

  it("keeps workspace settings composition in settings-panel-content without the old tab-shell wrapper file", () => {
    const settingsPanelContentSource = readFileSync(
      settingsPanelContentFile,
      "utf8"
    );
    const workspaceDirectoryHookSource = readFileSync(
      workspaceDirectoryHookFile,
      "utf8"
    );

    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/settings-workspace-section"'
    );
    expect(settingsPanelContentSource).toContain(
      'from "@/components/settings/use-settings-workspace-management"'
    );
    expect(settingsPanelContentSource).toContain(
      "function ReadySettingsWorkspaceSection"
    );
    expect(settingsPanelContentSource).toContain("deleteSelectedWorkspace");
    expect(settingsPanelContentSource).not.toContain(
      'from "@/components/settings/use-settings-panel-workspace"'
    );
    expect(workspaceDirectoryHookSource).toContain(
      'setWorkspaceStatus("Workspace deleted.")'
    );
    expect(workspaceDirectoryHookSource).toContain("nextWorkspaces.some");
    expect(workspaceDirectoryHookSource).toContain(
      'setActiveWorkspaceId(nextWorkspaces[0]?.workspaceId ?? "")'
    );
    expect(workspaceDirectoryHookSource).toContain('setActiveWorkspaceId("")');
    expect(existsSync(removedWrapperFile)).toBe(false);
  });
});
