import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildWorkspaceTreeFileIndex,
  createWorkspaceTreePathResolver,
} from "@/lib/workspace-tree-read-model";

const workspaceTreeClientSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-tree-client.ts"),
  "utf8"
);
const workspaceTreeReadModelSource = readFileSync(
  resolve(import.meta.dirname, "./workspace-tree-read-model.ts"),
  "utf8"
);

const snapshot = {
  files: [
    { folderId: "folder-a", id: "file-a", name: "Welcome.md" },
    { folderId: "folder-b", id: "file-b", name: "Plan.md" },
  ],
  folders: [
    { id: "root", name: "Workspace", parentId: null },
    { id: "folder-a", name: "Docs", parentId: "root" },
    { id: "folder-b", name: "Architecture", parentId: "folder-a" },
  ],
};

describe("workspace tree read model", () => {
  it("builds stable workspace paths without exposing the root folder name", () => {
    const resolver = createWorkspaceTreePathResolver(snapshot);

    expect(resolver.resolveFolderPath("folder-a")).toBe("Docs");
    expect(resolver.resolveFolderPath("folder-b")).toBe("Docs/Architecture");
    expect(
      resolver.getWorkspacePathForFile({
        folderId: "folder-b",
        id: "file-b",
        name: "Plan.md",
      })
    ).toBe("Docs/Architecture/Plan.md");
  });

  it("finds files by workspace path and produces a sorted file index", () => {
    const resolver = createWorkspaceTreePathResolver(snapshot);

    expect(
      resolver.findFileByWorkspacePath("Docs/Architecture/Plan.md")
    ).toEqual({
      folderId: "folder-b",
      id: "file-b",
      name: "Plan.md",
    });

    expect(buildWorkspaceTreeFileIndex(snapshot)).toEqual([
      {
        file: { folderId: "folder-b", id: "file-b", name: "Plan.md" },
        parentPath: "Docs/Architecture",
        workspacePath: "Docs/Architecture/Plan.md",
      },
      {
        file: { folderId: "folder-a", id: "file-a", name: "Welcome.md" },
        parentPath: "Docs",
        workspacePath: "Docs/Welcome.md",
      },
    ]);
  });

  it("keeps workspace tree loading split between the browser client/cache layer and the pure path/index read model", () => {
    expect(workspaceTreeClientSource).toContain("@/lib/workspace-tree-cache");
    expect(workspaceTreeClientSource).toContain(
      "export async function loadWorkspaceTreePayload"
    );
    expect(workspaceTreeClientSource).toContain("fetch(`/api/workspaces/");
    expect(workspaceTreeClientSource).toContain("writeWorkspaceTreePayload");

    expect(workspaceTreeReadModelSource).toContain(
      "export function createWorkspaceTreePathResolver"
    );
    expect(workspaceTreeReadModelSource).toContain(
      "export function buildWorkspaceTreeFileIndex"
    );
    expect(workspaceTreeReadModelSource).not.toContain("fetch(");
    expect(workspaceTreeReadModelSource).not.toContain(
      "readWorkspaceTreeCache("
    );
    expect(workspaceTreeReadModelSource).not.toContain(
      "writeWorkspaceTreeCache("
    );
  });
});
