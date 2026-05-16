import { describe, expect, it } from "vitest";
import {
  getSharedResourceMissingPageTitle,
  getSharedResourcePageHeading,
  getSharedResourceTitle,
} from "./shared-resource-page-model";

describe("shared resource page model", () => {
  it("maps resource types to stable shared-resource titles", () => {
    expect(getSharedResourceTitle("file")).toBe("Shared file");
    expect(getSharedResourceTitle("chat")).toBe("Shared method");
    expect(getSharedResourceTitle("folder")).toBe("Shared folder");
  });

  it("publishes Access denied as the explicit denied-state heading", () => {
    expect(
      getSharedResourcePageHeading({
        hasAccess: false,
        resourceType: "file",
      })
    ).toBe("Access denied");
  });

  it("publishes the same explicit title used by the not-found route", () => {
    expect(getSharedResourceMissingPageTitle()).toBe("This page isn't here.");
  });
});
