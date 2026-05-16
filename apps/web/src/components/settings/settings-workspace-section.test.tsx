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
    noteTemplates: [],
    openNoteTemplateEditor: () => {},
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
    setNoteTemplates: () => {},
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
    workspaceMembersLoadFailed: false,
    workspaceMembersLoading: false,
    workspaceName: "",
    workspaceStatus: null,
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
        runtime={createRuntime({ workspaceMembersLoadFailed: true })}
      />
    );

    expect(html).toContain("Unable to load workspace members.");
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
          workspacesLoadFailed: true,
        })}
      />
    );

    expect(html).toContain("Unable to load workspaces.");
    expect(html).not.toContain("No workspaces yet.");
  });
});
