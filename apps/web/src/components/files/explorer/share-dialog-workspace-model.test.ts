import { describe, expect, it } from "vitest";
import { getWorkspaceShareMembersStateMessage } from "@/components/files/explorer/share-dialog-workspace-model";

describe("workspace share members state", () => {
  it("distinguishes loading, failure, and true empty-member states", () => {
    expect(
      getWorkspaceShareMembersStateMessage({
        loading: true,
        loadFailed: false,
        memberCount: 0,
      })
    ).toBe("Loading workspace members...");

    expect(
      getWorkspaceShareMembersStateMessage({
        loading: false,
        loadFailed: true,
        memberCount: 0,
      })
    ).toBe("Unable to load workspace members.");

    expect(
      getWorkspaceShareMembersStateMessage({
        loading: false,
        loadFailed: false,
        memberCount: 0,
      })
    ).toBe("No members found for this workspace yet.");

    expect(
      getWorkspaceShareMembersStateMessage({
        loading: false,
        loadFailed: true,
        memberCount: 2,
      })
    ).toBeNull();
  });
});
