import { describe, expect, it } from "vitest";
import {
  getSidebarInvitationsState,
  getSidebarWorkspaceListState,
  shouldSyncActiveOrganization,
} from "./dashboard-sidebar-workspaces-model";

describe("dashboard sidebar workspaces model", () => {
  it("skips org sync when the target org is already active", () => {
    expect(
      shouldSyncActiveOrganization({
        activeOrganizationId: "org-1",
        targetOrganizationId: "org-1",
      })
    ).toBe(false);
  });

  it("skips org sync when the target org is blank", () => {
    expect(
      shouldSyncActiveOrganization({
        activeOrganizationId: "org-1",
        targetOrganizationId: "   ",
      })
    ).toBe(false);
  });

  it("requests org sync when the target org differs", () => {
    expect(
      shouldSyncActiveOrganization({
        activeOrganizationId: "org-1",
        targetOrganizationId: "org-2",
      })
    ).toBe(true);
  });

  it("keeps sidebar workspace loading, failure, and empty states distinct", () => {
    expect(
      getSidebarWorkspaceListState({
        activeWorkspaceLabel: "Alpha",
        loadFailed: false,
        loading: true,
        workspaceCount: 0,
      })
    ).toEqual({
      emptyMessage: "Loading workspaces...",
      subtitle: "Loading workspaces...",
    });

    expect(
      getSidebarWorkspaceListState({
        activeWorkspaceLabel: "Alpha",
        errorMessage: "workspace backend offline",
        loadFailed: true,
        loading: false,
        workspaceCount: 0,
      })
    ).toEqual({
      emptyMessage: "workspace backend offline",
      subtitle: "workspace backend offline",
    });

    expect(
      getSidebarWorkspaceListState({
        activeWorkspaceLabel: "Alpha",
        loadFailed: false,
        loading: false,
        workspaceCount: 0,
      })
    ).toEqual({
      emptyMessage: "No workspaces yet.",
      subtitle: "No workspaces yet.",
    });
  });

  it("keeps sidebar invitation loading, failure, and empty states distinct", () => {
    expect(
      getSidebarInvitationsState({
        invitationCount: 0,
        loadFailed: false,
        loading: true,
      })
    ).toEqual({
      emptyMessage: "Loading invites...",
      subtitle: "Loading invites...",
    });

    expect(
      getSidebarInvitationsState({
        errorMessage: "invites backend offline",
        invitationCount: 0,
        loadFailed: true,
        loading: false,
      })
    ).toEqual({
      emptyMessage: "invites backend offline",
      subtitle: "invites backend offline",
    });

    expect(
      getSidebarInvitationsState({
        invitationCount: 0,
        loadFailed: false,
        loading: false,
      })
    ).toEqual({
      emptyMessage: "No pending invites",
      subtitle: "0 pending",
    });
  });
});
