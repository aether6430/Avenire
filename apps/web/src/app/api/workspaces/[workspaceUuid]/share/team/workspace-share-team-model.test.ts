import { describe, expect, it } from "vitest";
import { buildWorkspaceTeamRecipients } from "./workspace-share-team-model";

describe("workspace share team model", () => {
  it("filters out the current user and members without a usable email", () => {
    expect(
      buildWorkspaceTeamRecipients({
        currentUserId: "user-1",
        membersResult: {
          members: [
            {
              role: "owner",
              userId: "user-1",
              user: { email: "owner@example.com" },
            },
            {
              role: "member",
              userId: "user-2",
              user: { email: "bea@example.com" },
            },
            {
              role: "member",
              userId: "user-3",
              user: { email: null },
            },
            {
              role: "member",
              userId: "user-4",
              user: { email: "   " },
            },
          ],
        },
      })
    ).toEqual([
      {
        email: "bea@example.com",
        role: "member",
        userId: "user-2",
      },
    ]);
  });
});
