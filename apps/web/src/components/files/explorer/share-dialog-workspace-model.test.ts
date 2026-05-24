import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { getWorkspaceShareMembersStateMessage } from "@/components/files/explorer/share-dialog-workspace-model";

const workspaceShareHookSource = readFileSync(
  resolve(import.meta.dirname, "./use-share-dialog-workspace-content.ts"),
  "utf8"
);

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

  it("keeps workspace-members load failures distinct from a true empty-member state in the runtime hook", () => {
    expect(workspaceShareHookSource).toContain("if (members === null) {");
    expect(workspaceShareHookSource).toContain(
      "setWorkspaceMembersLoadFailed(true);"
    );
  });
});
