import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { addPasskeyClientMock } = vi.hoisted(() => ({
  addPasskeyClientMock: vi.fn(),
}));

vi.mock("@avenire/auth/passkey-client", () => ({
  addPasskey: addPasskeyClientMock,
}));

import { useSettingsPanelPasskeys } from "@/components/settings/use-settings-panel-passkeys";

type HookValue = ReturnType<typeof useSettingsPanelPasskeys>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelPasskeys>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelPasskeys(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelPasskeys", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addPasskeyClientMock.mockResolvedValue(undefined);
  });

  it("refreshes passkeys through the dedicated auth transport", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
        ]),
        { status: 200 }
      )
    );

    const hook = renderHookValue({
      currentTab: "security",
    });

    await hook.refreshPasskeys();

    expect(fetch).toHaveBeenCalledWith("/api/auth/passkey/list-user-passkeys", {
      cache: "no-store",
    });
  });

  it("routes add/remove passkey actions through the auth client and delete endpoint", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
          ]),
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { deviceType: "MacBook Pro", id: "passkey-1", name: "Primary" },
          ]),
          { status: 200 }
        )
      );

    const hook = renderHookValue({
      currentTab: "security",
    });

    await hook.addPasskey();
    expect(addPasskeyClientMock).toHaveBeenCalledTimes(1);

    await hook.removePasskey("passkey-1");
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/api/auth/passkey/delete-passkey",
      expect.objectContaining({
        body: JSON.stringify({ id: "passkey-1" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
    );
  });
});
