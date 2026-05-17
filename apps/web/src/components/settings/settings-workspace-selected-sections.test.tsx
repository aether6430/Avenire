import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  SettingsWorkspaceMembersSectionMock,
  SettingsWorkspaceNoteTemplatesSectionMock,
  SettingsWorkspaceStatsSectionMock,
} = vi.hoisted(() => ({
  SettingsWorkspaceMembersSectionMock: vi.fn(() => (
    <div>WORKSPACE_MEMBERS</div>
  )),
  SettingsWorkspaceNoteTemplatesSectionMock: vi.fn(() => (
    <div>WORKSPACE_TEMPLATES</div>
  )),
  SettingsWorkspaceStatsSectionMock: vi.fn(() => <div>WORKSPACE_STATS</div>),
}));

vi.mock("@/components/settings/settings-workspace-members-section", () => ({
  SettingsWorkspaceMembersSection: SettingsWorkspaceMembersSectionMock,
}));

vi.mock(
  "@/components/settings/settings-workspace-note-templates-section",
  () => ({
    SettingsWorkspaceNoteTemplatesSection:
      SettingsWorkspaceNoteTemplatesSectionMock,
  })
);

vi.mock("@/components/settings/settings-workspace-stats-section", () => ({
  SettingsWorkspaceStatsSection: SettingsWorkspaceStatsSectionMock,
}));

import { SettingsWorkspaceSelectedSections } from "@/components/settings/settings-workspace-selected-sections";

describe("SettingsWorkspaceSelectedSections", () => {
  it("routes the workspace settings sections through their local owners", () => {
    const props = {
      currentUserEmail: "owner@example.com",
      inviteWorkspaceMember: async () => undefined,
      isInvitingMember: false,
      noteTemplates: [],
      openNoteTemplateEditor: () => undefined,
      privacyMode: false,
      removeWorkspaceMember: async () => undefined,
      selectedWorkspace: { name: "Workspace" },
      selectedWorkspaceMemberCount: 1,
      setNoteTemplates: () => undefined,
      setWorkspaceEmail: () => undefined,
      workspaceEmail: "",
      workspaceMembers: [],
      workspaceMembersLoadFailed: false,
      workspaceMembersLoading: false,
      workspaceStatus: null,
      workspaceUsage: null,
      workspaceUsageLoadFailed: false,
      workspaceUsageLoading: false,
      workspaceUsageStatus: null,
    };

    const html = renderToStaticMarkup(
      <SettingsWorkspaceSelectedSections {...props} />
    );

    expect(SettingsWorkspaceStatsSectionMock).toHaveBeenCalledWith(
      {
        workspaceUsage: null,
        workspaceUsageLoadFailed: false,
        workspaceUsageLoading: false,
        workspaceUsageStatus: null,
      },
      undefined
    );
    expect(SettingsWorkspaceNoteTemplatesSectionMock).toHaveBeenCalledWith(
      {
        noteTemplates: [],
        openNoteTemplateEditor: props.openNoteTemplateEditor,
        setNoteTemplates: props.setNoteTemplates,
      },
      undefined
    );
    expect(SettingsWorkspaceMembersSectionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        currentUserEmail: "owner@example.com",
        selectedWorkspaceMemberCount: 1,
      }),
      undefined
    );
    expect(html).toContain("WORKSPACE_STATS");
    expect(html).toContain("WORKSPACE_TEMPLATES");
    expect(html).toContain("WORKSPACE_MEMBERS");
  });
});
