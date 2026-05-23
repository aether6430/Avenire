import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSettingsPanelSudo } from "@/components/settings/use-settings-panel-sudo";

type HookValue = ReturnType<typeof useSettingsPanelSudo>;

const useSettingsPanelSudoSource = readFileSync(
  resolve(import.meta.dirname, "./use-settings-panel-sudo.ts"),
  "utf8"
);

function renderHookValue(
  options: Parameters<typeof useSettingsPanelSudo>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelSudo(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelSudo", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes sudo status through the dedicated transport", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ active: true }), { status: 200 })
    );
    const hook = renderHookValue({ currentTab: "security" });

    await hook.refreshSudoStatus();

    expect(fetch).toHaveBeenCalledWith("/api/security/sudo", {
      cache: "no-store",
    });
    expect(useSettingsPanelSudoSource).toContain(
      "createSudoStatusFailureState"
    );
    expect(useSettingsPanelSudoSource).toContain("error: payload.error");
  });

  it("requests and verifies sudo codes through the security endpoint", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const hook = renderHookValue({ currentTab: "security" });

    await hook.requestSudoCode();
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/api/security/sudo",
      expect.objectContaining({
        body: JSON.stringify({ action: "request" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );

    hook.setSudoCode("123456");
    await hook.verifySudoCodeAndContinue();
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/security/sudo",
      expect.objectContaining({
        body: JSON.stringify({ action: "verify", code: "" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );
  });

  it("fails closed when sudo request or verify transport rejects", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("request offline"))
      .mockRejectedValueOnce(new Error("verify offline"));

    const hook = renderHookValue({ currentTab: "security" });

    await expect(hook.requestSudoCode()).resolves.toBeUndefined();
    await expect(hook.verifySudoCodeAndContinue()).resolves.toBeUndefined();
  });

  it("fails closed when sudo status refresh gets a non-ok response or transport rejection", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "sudo backend offline" }), {
          status: 500,
        })
      )
      .mockRejectedValueOnce(new Error("sudo transport offline"));

    const hook = renderHookValue({ currentTab: "security" });

    await expect(hook.refreshSudoStatus()).resolves.toBeUndefined();
    await expect(hook.refreshSudoStatus()).resolves.toBeUndefined();
  });

  it("opens a pending sudo action through verifySudoSession", async () => {
    const hook = renderHookValue({ currentTab: "security" });

    await hook.verifySudoSession();

    expect(hook.pendingSudoActionRef.current).toEqual(expect.any(Function));
  });

  it("fails closed when sudo route session lookup throws before get/post handlers run", async () => {
    vi.resetModules();

    const getSessionUserMock = vi
      .fn()
      .mockRejectedValue(new Error("sudo auth offline"));
    const handleSudoRouteGetMock = vi.fn();
    const handleSudoRoutePostMock = vi.fn();

    vi.doMock("@/lib/workspace", () => ({
      getSessionUser: getSessionUserMock,
    }));
    vi.doMock("@/app/api/security/sudo/sudo-route-get", () => ({
      handleSudoRouteGet: handleSudoRouteGetMock,
    }));
    vi.doMock("@/app/api/security/sudo/sudo-route-post", () => ({
      handleSudoRoutePost: handleSudoRoutePostMock,
    }));

    const { GET, POST } = await import("@/app/api/security/sudo/route");

    let response = await GET();
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "sudo auth offline",
    });

    response = await POST(
      new Request("http://localhost:3003/api/security/sudo", {
        body: JSON.stringify({ action: "request" }),
        method: "POST",
      })
    );
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "sudo auth offline",
    });
    expect(handleSudoRouteGetMock).not.toHaveBeenCalled();
    expect(handleSudoRoutePostMock).not.toHaveBeenCalled();
  });
});
