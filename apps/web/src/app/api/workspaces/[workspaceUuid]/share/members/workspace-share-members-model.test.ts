import { describe, expect, it } from "vitest";
import {
  buildWorkspaceShareUrl,
  canManageWorkspaceMembers,
  filterWorkspaceShareMembers,
  normalizeOrganizationMembers,
  resolveInviteRole,
} from "./workspace-share-members-model";

describe("workspace share members model", () => {
  it("resolves invite roles conservatively", () => {
    expect(resolveInviteRole("admin")).toBe("admin");
    expect(resolveInviteRole("member")).toBe("member");
    expect(resolveInviteRole("weird")).toBe("member");
  });

  it("normalizes auth member payloads and filters by query", () => {
    const members = normalizeOrganizationMembers({
      members: [
        {
          id: "member-1",
          role: "admin",
          userId: "user-1",
          user: {
            email: "alex@example.com",
            image: "https://example.com/a.png",
            name: "Alex",
          },
        },
        {
          id: "member-2",
          role: null,
          user: {
            id: "user-2",
            email: "bea@example.com",
            name: "Bea",
          },
        },
      ],
    });

    expect(members).toEqual([
      {
        avatar: "https://example.com/a.png",
        email: "alex@example.com",
        id: "member-1",
        name: "Alex",
        role: "admin",
        userId: "user-1",
      },
      {
        avatar: null,
        email: "bea@example.com",
        id: "member-2",
        name: "Bea",
        role: "member",
        userId: "user-2",
      },
    ]);
    expect(filterWorkspaceShareMembers({ members, query: "bea" })).toEqual([
      members[1],
    ]);
  });

  it("builds a workspace share URL and admin gate correctly", () => {
    expect(
      buildWorkspaceShareUrl({
        baseUrl: "https://avenire.app",
        rootFolderId: "folder-1",
        workspaceUuid: "workspace-1",
      })
    ).toBe("https://avenire.app/workspace/files/workspace-1/folder/folder-1");
    expect(canManageWorkspaceMembers("owner")).toBe(true);
    expect(canManageWorkspaceMembers("admin")).toBe(true);
    expect(canManageWorkspaceMembers("member")).toBe(false);
  });
});
