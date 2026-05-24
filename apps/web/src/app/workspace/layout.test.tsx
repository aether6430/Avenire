import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  extractRouterConfigMock,
  requireRouteSessionMock,
  storageSSRPluginMock,
  workspaceLayoutClientEffectsMock,
  workspaceLayoutShellMock,
} = vi.hoisted(() => ({
  extractRouterConfigMock: vi.fn(() => ({ files: {} })),
  requireRouteSessionMock: vi.fn(),
  storageSSRPluginMock: vi.fn(() =>
    createElement("div", { "data-storage-ssr": "1" })
  ),
  workspaceLayoutClientEffectsMock: vi.fn(() =>
    createElement("div", { "data-workspace-client-effects": "1" })
  ),
  workspaceLayoutShellMock: vi.fn(
    ({ children }: { children: React.ReactNode }) =>
      createElement("section", { "data-workspace-shell": "1" }, children)
  ),
}));

vi.mock("@avenire/storage", () => ({
  extractRouterConfig: extractRouterConfigMock,
}));

vi.mock("@avenire/storage/ssr", () => ({
  StorageSSRPlugin: storageSSRPluginMock,
}));

vi.mock("@/components/dashboard/workspace-layout-shell", () => ({
  WorkspaceLayoutShell: workspaceLayoutShellMock,
}));

vi.mock("@/components/pwa/workspace-layout-client-effects", () => ({
  WorkspaceLayoutClientEffects: workspaceLayoutClientEffectsMock,
}));

vi.mock("@/lib/upload", () => ({
  router: { files: {} },
}));

vi.mock("@/lib/workspace-route-context", () => ({
  requireRouteSession: requireRouteSessionMock,
}));

import WorkspaceLayout from "./layout";

describe("WorkspaceLayout", () => {
  it("requires an authenticated route session before rendering workspace shell", async () => {
    requireRouteSessionMock.mockResolvedValueOnce({
      user: { id: "user-1" },
    });

    const element = await WorkspaceLayout({
      children: createElement("div", null, "workspace-child"),
    });
    const html = renderToStaticMarkup(element);

    expect(requireRouteSessionMock).toHaveBeenCalledTimes(1);
    expect(storageSSRPluginMock).toHaveBeenCalledTimes(1);
    expect(workspaceLayoutClientEffectsMock).toHaveBeenCalledTimes(1);
    expect(workspaceLayoutShellMock).toHaveBeenCalledTimes(1);
    expect(html).toContain('data-workspace-client-effects="1"');
    expect(html).toContain('data-workspace-shell="1"');
    expect(html).toContain("workspace-child");
  });

  it("propagates the login redirect when the route session is missing", async () => {
    requireRouteSessionMock.mockRejectedValueOnce(new Error("redirect:/login"));

    await expect(
      WorkspaceLayout({
        children: createElement("div", null, "workspace-child"),
      })
    ).rejects.toThrow("redirect:/login");
  });

  it("keeps workspace layout focused on auth, storage SSR, and the shell body only", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const layoutSource = readFileSync(join(directory, "layout.tsx"), "utf8");
    const shellSource = readFileSync(
      join(directory, "../../components/dashboard/workspace-layout-shell.tsx"),
      "utf8"
    );
    const clientEffectsSource = readFileSync(
      join(
        directory,
        "../../components/pwa/workspace-layout-client-effects.tsx"
      ),
      "utf8"
    );
    const serviceWorkerSource = readFileSync(
      join(directory, "../../components/pwa/ServiceWorkerRegistration.tsx"),
      "utf8"
    );
    const workerScriptSource = readFileSync(
      join(directory, "../../../public/sw.js"),
      "utf8"
    );
    const gitignoreSource = readFileSync(
      join(directory, "../../../../../.gitignore"),
      "utf8"
    );

    expect(layoutSource).toContain("WorkspaceLayoutClientEffects");
    expect(layoutSource).toContain("<WorkspaceLayoutClientEffects />");
    expect(layoutSource).not.toContain("ServiceWorkerRegistration");
    expect(layoutSource).not.toContain(
      '<Toaster closeButton position="top-right" richColors />'
    );
    expect(shellSource).toContain("Suspense");
    expect(shellSource).toContain("DashboardLayout as DashboardShellLayout");
    expect(shellSource).not.toContain("dynamic(");
    expect(shellSource).toContain("ThemeProvider as NextThemesProvider");
    expect(shellSource).toContain('storageKey="avenire-theme"');
    expect(shellSource).toContain('defaultTheme="light"');
    expect(shellSource).toContain("enableSystem={false}");
    expect(shellSource.indexOf("<main ")).toBeLessThan(
      shellSource.indexOf("<NextThemesProvider")
    );
    expect(clientEffectsSource).toContain("ServiceWorkerRegistration");
    expect(clientEffectsSource).toContain(
      '<Toaster closeButton position="top-right" richColors />'
    );
    expect(serviceWorkerSource).toContain(
      "navigator.serviceWorker.getRegistrations()"
    );
    expect(serviceWorkerSource).toContain('cacheName.startsWith("avenire-")');
    expect(serviceWorkerSource).toContain("window.location.hostname");
    expect(serviceWorkerSource).toContain("clearLocalServiceWorkers()");
    expect(serviceWorkerSource).toContain(
      'navigator.serviceWorker.register("/sw.js")'
    );
    expect(workerScriptSource).toContain("IS_LOCAL_HOST");
    expect(workerScriptSource).toContain("self.registration.unregister()");
    expect(workerScriptSource).toContain("if (IS_LOCAL_HOST) {");
    expect(gitignoreSource).toContain(".DS_Store");
    expect(gitignoreSource).toContain("**/.DS_Store");
    expect(gitignoreSource).not.toContain("\ndocs/\n");
    expect(gitignoreSource).not.toContain("\nwritings/\n");
    expect(gitignoreSource).not.toContain("\nIngestion/\n");
    expect(gitignoreSource).not.toContain("\n/instruction.md\n");
    expect(gitignoreSource).toContain("/screenshots/T*.png");
    expect(gitignoreSource).toContain("/screenshots/T*.svg");
  });

  it("keeps tracked screenshot artifacts anchored by notes.md instead of leaving orphan operator images in git history", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    const repoRoot = join(directory, "../../../../../");
    const notesSource = readFileSync(join(repoRoot, "notes.md"), "utf8");
    const trackedScreenshots = execSync("git ls-files screenshots", {
      cwd: repoRoot,
      encoding: "utf8",
    })
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((file) => existsSync(join(repoRoot, file)));

    const orphanedScreenshots = trackedScreenshots.filter((file) => {
      const baseName = file.replace(/^screenshots\//, "");
      return !(notesSource.includes(baseName) || notesSource.includes(file));
    });

    expect(orphanedScreenshots).toEqual([]);
  });
});
