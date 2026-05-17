import { describe, expect, it } from "vitest";
import {
  buildWorkspaceFileShareUrl,
  normalizeWorkspaceFileSharePermission,
  parseWorkspaceFileShareGrantBody,
} from "./workspace-file-share-route-model";

describe("workspace file share route model", () => {
  it("builds the canonical file share URL", () => {
    expect(buildWorkspaceFileShareUrl("https://avenire.app", "token-123")).toBe(
      "https://avenire.app/share/token-123"
    );
  });

  it("normalizes file share permissions and trims emails", () => {
    expect(normalizeWorkspaceFileSharePermission("editor")).toBe("editor");
    expect(normalizeWorkspaceFileSharePermission("viewer")).toBe("viewer");
    expect(normalizeWorkspaceFileSharePermission("owner")).toBe("viewer");

    expect(
      parseWorkspaceFileShareGrantBody({
        email: "  person@example.com  ",
        permission: "editor",
      })
    ).toEqual({
      email: "person@example.com",
      permission: "editor",
    });
    expect(
      parseWorkspaceFileShareGrantBody({
        email: "   ",
        permission: "owner",
      })
    ).toEqual({
      email: null,
      permission: "viewer",
    });
  });
});
