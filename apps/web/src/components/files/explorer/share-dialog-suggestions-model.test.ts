import { describe, expect, it } from "vitest";
import { shouldLoadShareSuggestions } from "@/components/files/explorer/share-dialog-suggestions-model";

describe("share dialog suggestions model", () => {
  it("stays idle while the dialog is closed", () => {
    expect(
      shouldLoadShareSuggestions({
        isAtWorkspaceRoot: false,
        open: false,
        scope: "file",
        variant: "file",
        workspaceUuid: "workspace-1",
      })
    ).toBe(false);
  });

  it("loads file suggestions only for the file dialog", () => {
    expect(
      shouldLoadShareSuggestions({
        isAtWorkspaceRoot: false,
        open: true,
        scope: "file",
        variant: "file",
        workspaceUuid: "workspace-1",
      })
    ).toBe(true);

    expect(
      shouldLoadShareSuggestions({
        isAtWorkspaceRoot: false,
        open: true,
        scope: "file",
        variant: "folder",
        workspaceUuid: "workspace-1",
      })
    ).toBe(false);
  });

  it("distinguishes workspace and folder suggestion scopes", () => {
    expect(
      shouldLoadShareSuggestions({
        isAtWorkspaceRoot: true,
        open: true,
        scope: "workspace",
        variant: "folder",
        workspaceUuid: "workspace-1",
      })
    ).toBe(true);

    expect(
      shouldLoadShareSuggestions({
        isAtWorkspaceRoot: true,
        open: true,
        scope: "folder",
        variant: "folder",
        workspaceUuid: "workspace-1",
      })
    ).toBe(false);

    expect(
      shouldLoadShareSuggestions({
        isAtWorkspaceRoot: false,
        open: true,
        scope: "folder",
        variant: "folder",
        workspaceUuid: "workspace-1",
      })
    ).toBe(true);
  });
});
