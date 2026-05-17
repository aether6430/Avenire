import { describe, expect, it } from "vitest";
import {
  buildWorkspaceFolderShareUrl,
  normalizeWorkspaceFolderSharePermission,
  parseWorkspaceFolderShareGrantBody,
} from "./workspace-folder-share-route-model";

describe("workspace folder share route model", () => {
  it("builds the canonical folder share URL", () => {
    expect(
      buildWorkspaceFolderShareUrl("https://avenire.app", "token-123")
    ).toBe("https://avenire.app/share/token-123");
  });

  it("normalizes folder share permissions and trims emails", () => {
    expect(normalizeWorkspaceFolderSharePermission("editor")).toBe("editor");
    expect(normalizeWorkspaceFolderSharePermission("viewer")).toBe("viewer");
    expect(normalizeWorkspaceFolderSharePermission("owner")).toBe("viewer");

    expect(
      parseWorkspaceFolderShareGrantBody({
        email: "  person@example.com  ",
        permission: "editor",
      })
    ).toEqual({
      email: "person@example.com",
      permission: "editor",
    });
    expect(
      parseWorkspaceFolderShareGrantBody({
        email: "   ",
        permission: "owner",
      })
    ).toEqual({
      email: null,
      permission: "viewer",
    });
  });
});
