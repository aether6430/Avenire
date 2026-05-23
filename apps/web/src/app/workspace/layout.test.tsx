import { readFileSync } from "node:fs";
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

    expect(layoutSource).toContain("WorkspaceLayoutClientEffects");
    expect(layoutSource).toContain("<WorkspaceLayoutClientEffects />");
    expect(layoutSource).not.toContain("ServiceWorkerRegistration");
    expect(layoutSource).not.toContain(
      '<Toaster closeButton position="top-right" richColors />'
    );
    expect(shellSource).toContain("Suspense");
    expect(shellSource).toContain("DashboardLayout as DashboardShellLayout");
    expect(shellSource).not.toContain("dynamic(");
    expect(shellSource).toContain("<ThemeProvider>");
    expect(shellSource.indexOf("<main ")).toBeLessThan(
      shellSource.indexOf("<ThemeProvider>")
    );
    expect(clientEffectsSource).toContain("ServiceWorkerRegistration");
    expect(clientEffectsSource).toContain(
      '<Toaster closeButton position="top-right" richColors />'
    );
  });
});
