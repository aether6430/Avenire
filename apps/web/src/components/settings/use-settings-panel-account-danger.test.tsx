import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useSettingsPanelAccountDanger } from "@/components/settings/use-settings-panel-account-danger";

type HookValue = ReturnType<typeof useSettingsPanelAccountDanger>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelAccountDanger>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelAccountDanger(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelAccountDanger", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("requests sudo before deleting when no active sudo session exists", async () => {
    const requestSudoForAction = vi.fn();
    const hook = renderHookValue({
      requestSudoForAction,
      setSudoActive: vi.fn(),
      sudoActive: false,
    });

    await hook.deleteAccount();

    expect(requestSudoForAction).toHaveBeenCalledWith(
      "delete your account",
      expect.any(Function)
    );
  });

  it("deletes the account through the api and redirects on success", async () => {
    vi.stubGlobal("window", {
      location: { href: "" },
    });
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 200 })
    );
    const hook = renderHookValue({
      requestSudoForAction: vi.fn(),
      setSudoActive: vi.fn(),
      sudoActive: true,
    });

    await hook.deleteAccount();

    expect(fetch).toHaveBeenCalledWith("/api/account", { method: "DELETE" });
    expect(window.location.href).toBe("/login");
    vi.unstubAllGlobals();
  });

  it("re-requests sudo on 403 and surfaces API errors otherwise", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 403 }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Deletion blocked." }), {
          status: 500,
        })
      );

    const requestSudoForAction = vi.fn();
    const setSudoActive = vi.fn();
    const hook = renderHookValue({
      requestSudoForAction,
      setSudoActive,
      sudoActive: true,
    });

    await hook.deleteAccount();
    expect(setSudoActive).toHaveBeenCalledWith(false);
    expect(requestSudoForAction).toHaveBeenCalledWith(
      "delete your account",
      expect.any(Function)
    );

    await hook.runDeleteAccount();
    expect(fetch).toHaveBeenNthCalledWith(2, "/api/account", {
      method: "DELETE",
    });
  });
});
