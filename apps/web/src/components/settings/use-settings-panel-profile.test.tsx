import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateUserMock } = vi.hoisted(() => ({
  updateUserMock: vi.fn(),
}));

vi.mock("@avenire/auth/client", () => ({
  updateUser: updateUserMock,
}));

import { useSettingsPanelProfile } from "@/components/settings/use-settings-panel-profile";

type HookValue = ReturnType<typeof useSettingsPanelProfile>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelProfile>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelProfile(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateUserMock.mockResolvedValue({});
  });

  it("hydrates initial profile draft values from the session user", () => {
    const hook = renderHookValue({
      sessionUser: {
        image: "https://cdn.avenire.app/avatar.png",
        name: "Owner",
      },
    });

    expect(hook.profileImage).toBe("https://cdn.avenire.app/avatar.png");
    expect(hook.profileName).toBe("Owner");
    expect(hook.profileStatus).toBeNull();
    expect(hook.isSavingProfile).toBe(false);
  });

  it("saves trimmed profile payloads and returns success/failure explicitly", async () => {
    const hook = renderHookValue({
      sessionUser: {
        image: "https://cdn.avenire.app/avatar.png",
        name: "  Owner  ",
      },
    });

    await expect(
      hook.saveProfile(" https://cdn.avenire.app/next.png ")
    ).resolves.toBe(true);
    expect(updateUserMock).toHaveBeenCalledWith({
      image: "https://cdn.avenire.app/next.png",
      name: "Owner",
    });

    updateUserMock.mockResolvedValueOnce({ error: "boom" });
    await expect(hook.saveProfile()).resolves.toBe(false);

    updateUserMock.mockRejectedValueOnce(new Error("network offline"));
    await expect(hook.saveProfile()).resolves.toBe(false);
  });
});
