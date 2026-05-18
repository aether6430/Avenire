import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { SettingsWorkspaceMembersSection } from "@/components/settings/settings-workspace-members-section";

vi.mock("@avenire/ui/components/badge", () => ({
  Badge: ({ children }: { children: ReactNode }) =>
    createElement("span", null, children),
}));

vi.mock("@avenire/ui/components/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));

vi.mock("@avenire/ui/components/input", () => ({
  Input: (props: Record<string, unknown>) => createElement("input", props),
}));

vi.mock("@/components/shared/sensitive-text", () => ({
  SensitiveText: ({ value }: { value: string }) =>
    createElement("span", null, value),
}));

describe("SettingsWorkspaceMembersSection", () => {
  it("renders explicit member loading and failure states", () => {
    const loadingHtml = renderToStaticMarkup(
      <SettingsWorkspaceMembersSection
        currentUserEmail="owner@example.com"
        inviteWorkspaceMember={async () => {}}
        isInvitingMember={false}
        privacyMode={false}
        removeWorkspaceMember={async () => {}}
        selectedWorkspaceMemberCount={0}
        setWorkspaceEmail={() => {}}
        workspaceEmail=""
        workspaceMembers={[]}
        workspaceMembersLoadFailed={false}
        workspaceMembersLoading
        workspaceStatus={null}
      />
    );
    expect(loadingHtml).toContain("Loading workspace members...");

    const failedHtml = renderToStaticMarkup(
      <SettingsWorkspaceMembersSection
        currentUserEmail="owner@example.com"
        inviteWorkspaceMember={async () => {}}
        isInvitingMember={false}
        privacyMode={false}
        removeWorkspaceMember={async () => {}}
        selectedWorkspaceMemberCount={0}
        setWorkspaceEmail={() => {}}
        workspaceEmail=""
        workspaceMembers={[]}
        workspaceMembersLoadFailed
        workspaceMembersLoading={false}
        workspaceStatus={null}
      />
    );
    expect(failedHtml).toContain("Unable to load workspace members.");
  });

  it("renders current-user and removable-member states explicitly", () => {
    const html = renderToStaticMarkup(
      <SettingsWorkspaceMembersSection
        currentUserEmail="owner@example.com"
        inviteWorkspaceMember={async () => {}}
        isInvitingMember={false}
        privacyMode={false}
        removeWorkspaceMember={async () => {}}
        selectedWorkspaceMemberCount={2}
        setWorkspaceEmail={() => {}}
        workspaceEmail="teammate@example.com"
        workspaceMembers={[
          {
            email: "owner@example.com",
            id: "member-1",
            name: "Owner",
            role: "owner",
            userId: "user-1",
          },
          {
            email: "teammate@example.com",
            id: "member-2",
            name: "Teammate",
            role: "member",
            userId: "user-2",
          },
        ]}
        workspaceMembersLoadFailed={false}
        workspaceMembersLoading={false}
        workspaceStatus="Invite sent."
      />
    );

    expect(html).toContain("2 total");
    expect(html).toContain("Owner");
    expect(html).toContain("You");
    expect(html).toContain("Teammate");
    expect(html).toContain("Remove");
    expect(html).toContain("Invite sent.");
    expect(html).toContain('value="teammate@example.com"');
    expect(html).toContain(">Add member<");
  });
});
