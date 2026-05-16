import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const {
  extractRouterConfigMock,
  requireRouteSessionMock,
  serviceWorkerRegistrationMock,
  storageSSRPluginMock,
  toasterMock,
  workspaceLayoutShellMock,
} = vi.hoisted(() => ({
  extractRouterConfigMock: vi.fn(() => ({ files: {} })),
  requireRouteSessionMock: vi.fn(),
  serviceWorkerRegistrationMock: vi.fn(() =>
    createElement("div", { "data-sw": "1" })
  ),
  storageSSRPluginMock: vi.fn(() =>
    createElement("div", { "data-storage-ssr": "1" })
  ),
  toasterMock: vi.fn(() => createElement("div", { "data-toaster": "1" })),
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

vi.mock("@avenire/ui/components/sonner", () => ({
  Toaster: toasterMock,
}));

vi.mock("@/components/dashboard/workspace-layout-shell", () => ({
  WorkspaceLayoutShell: workspaceLayoutShellMock,
}));

vi.mock("@/components/pwa/ServiceWorkerRegistration", () => ({
  ServiceWorkerRegistration: serviceWorkerRegistrationMock,
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
    expect(serviceWorkerRegistrationMock).toHaveBeenCalledTimes(1);
    expect(workspaceLayoutShellMock).toHaveBeenCalledTimes(1);
    expect(toasterMock).toHaveBeenCalledTimes(1);
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
});
