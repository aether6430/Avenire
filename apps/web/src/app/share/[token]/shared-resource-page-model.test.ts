import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getSharedResourceMissingPageTitle,
  getSharedResourcePageHeading,
  getSharedResourceTitle,
} from "./shared-resource-page-model";

const notFoundFile = path.resolve(import.meta.dirname, "../../not-found.tsx");

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

  it("keeps the not-found route on the direct fail-safe shell with workspace-first recovery links", () => {
    const source = readFileSync(notFoundFile, "utf8");

    expect(source).not.toContain("import { AuthParticlePage }");
    expect(source).not.toContain("import { ParticleField }");
    expect(source).toContain("<main className=");
    expect(source).toContain('href="/workspace"');
    expect(source).toContain('href="/"');
    expect(source).toContain("Open workspace");
    expect(source).toContain("start again from home");
  });
});
