import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSettingsPanelSudo } from "@/components/settings/use-settings-panel-sudo";

type HookValue = ReturnType<typeof useSettingsPanelSudo>;

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

  it("opens a pending sudo action through verifySudoSession", async () => {
    const hook = renderHookValue({ currentTab: "security" });

    await hook.verifySudoSession();

    expect(hook.pendingSudoActionRef.current).toEqual(expect.any(Function));
  });
});
