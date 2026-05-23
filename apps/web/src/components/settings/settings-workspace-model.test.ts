import { describe, expect, it } from "vitest";
import {
  getWorkspaceListStateMessage,
  getWorkspaceMembersStateMessage,
  getWorkspaceUsageValueState,
} from "./settings-workspace-model";

describe("settings workspace model", () => {
  it("keeps workspace member loading, failure, and empty states distinct", () => {
    expect(
      getWorkspaceMembersStateMessage({
        loading: true,
        loadFailed: false,
        memberCount: 0,
      })
    ).toBe("Loading workspace members...");

    expect(
      getWorkspaceMembersStateMessage({
        errorMessage: "members backend offline",
        loading: false,
        loadFailed: true,
        memberCount: 0,
      })
    ).toBe("members backend offline");

    expect(
      getWorkspaceMembersStateMessage({
        loading: false,
        loadFailed: false,
        memberCount: 0,
      })
    ).toBe("No members found.");

    expect(
      getWorkspaceMembersStateMessage({
        loading: false,
        loadFailed: false,
        memberCount: 2,
      })
    ).toBeNull();
  });

  it("keeps workspace usage loading and failure distinct from a real loaded value", () => {
    expect(
      getWorkspaceUsageValueState({
        loadFailed: false,
        loading: true,
        readyLabel: "12",
      })
    ).toEqual({
      label: "Loading...",
      showSpinner: true,
    });

    expect(
      getWorkspaceUsageValueState({
        loadFailed: true,
        loading: false,
        readyLabel: "12",
      })
    ).toEqual({
      label: "Unavailable",
      showSpinner: false,
    });

    expect(
      getWorkspaceUsageValueState({
        loadFailed: false,
        loading: false,
        readyLabel: "12",
      })
    ).toEqual({
      label: "12",
      showSpinner: false,
    });
  });

  it("keeps workspace list loading, failure, and empty states distinct", () => {
    expect(
      getWorkspaceListStateMessage({
        loading: true,
        loadFailed: false,
        workspaceCount: 0,
      })
    ).toBe("Loading workspaces...");

    expect(
      getWorkspaceListStateMessage({
        errorMessage: "workspace directory offline",
        loading: false,
        loadFailed: true,
        workspaceCount: 0,
      })
    ).toBe("workspace directory offline");

    expect(
      getWorkspaceListStateMessage({
        loading: false,
        loadFailed: false,
        workspaceCount: 0,
      })
    ).toBe("No workspaces yet.");

    expect(
      getWorkspaceListStateMessage({
        loading: false,
        loadFailed: false,
        workspaceCount: 2,
      })
    ).toBeNull();
  });
});
