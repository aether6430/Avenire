import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { startUploadMock } = vi.hoisted(() => ({
  startUploadMock: vi.fn(),
}));

vi.mock("@/lib/uploadthing", () => ({
  useUploadThing: () => ({
    startUpload: startUploadMock,
  }),
}));

import { useSettingsPanelAvatar } from "@/components/settings/use-settings-panel-avatar";

type HookValue = ReturnType<typeof useSettingsPanelAvatar>;

function renderHookValue(
  options: Parameters<typeof useSettingsPanelAvatar>[0]
): HookValue {
  let hookValue: HookValue | null = null;

  function Probe() {
    hookValue = useSettingsPanelAvatar(options);
    return null;
  }

  renderToStaticMarkup(<Probe />);

  if (!hookValue) {
    throw new Error("Hook value was not captured.");
  }

  return hookValue;
}

describe("useSettingsPanelAvatar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    startUploadMock.mockResolvedValue([
      { ufsUrl: "https://cdn.avenire.app/avatar.png" },
    ]);
  });

  it("ignores empty avatar file selections", async () => {
    const setProfileImage = vi.fn();
    const setProfileStatus = vi.fn();
    const saveProfile = vi.fn();
    const hook = renderHookValue({
      profileImage: "",
      profileName: "Owner",
      saveProfile,
      sessionUser: { email: "owner@example.com", name: "Owner" },
      setProfileImage,
      setProfileStatus,
    });

    await hook.handleAvatarFileChange({
      target: {
        files: [],
        value: "chosen-file",
      },
    } as never);

    expect(startUploadMock).not.toHaveBeenCalled();
    expect(saveProfile).not.toHaveBeenCalled();
    expect(setProfileImage).not.toHaveBeenCalled();
    expect(setProfileStatus).not.toHaveBeenCalled();
  });

  it("uploads avatars, persists the uploaded URL, and reports success", async () => {
    const setProfileImage = vi.fn();
    const setProfileStatus = vi.fn();
    const saveProfile = vi.fn().mockResolvedValue(true);
    const hook = renderHookValue({
      profileImage: "",
      profileName: "Owner",
      saveProfile,
      sessionUser: { email: "owner@example.com", name: "Owner" },
      setProfileImage,
      setProfileStatus,
    });

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    const target = { files: [file], value: "chosen-file" };
    await hook.handleAvatarFileChange({ target } as never);

    expect(target.value).toBe("");
    expect(startUploadMock).toHaveBeenCalledWith([file]);
    expect(setProfileStatus).toHaveBeenNthCalledWith(1, "Uploading avatar...");
    expect(setProfileImage).toHaveBeenCalledWith(
      "https://cdn.avenire.app/avatar.png"
    );
    expect(saveProfile).toHaveBeenCalledWith(
      "https://cdn.avenire.app/avatar.png"
    );
    expect(setProfileStatus).toHaveBeenLastCalledWith(
      "Avatar uploaded and saved."
    );
  });

  it("surfaces missing upload urls and upload errors explicitly", async () => {
    const setProfileImage = vi.fn();
    const setProfileStatus = vi.fn();
    const saveProfile = vi.fn();
    const hook = renderHookValue({
      profileImage: "",
      profileName: "Owner",
      saveProfile,
      sessionUser: { email: "owner@example.com", name: "Owner" },
      setProfileImage,
      setProfileStatus,
    });

    const file = new File(["avatar"], "avatar.png", { type: "image/png" });
    startUploadMock.mockResolvedValueOnce([{}]);
    await hook.handleAvatarFileChange({
      target: { files: [file], value: "chosen-file" },
    } as never);
    expect(setProfileStatus).toHaveBeenLastCalledWith(
      "Unable to upload avatar."
    );

    startUploadMock.mockRejectedValueOnce(
      Object.assign(new Error("boom"), { code: "TOO_LARGE" })
    );
    await hook.handleAvatarFileChange({
      target: { files: [file], value: "chosen-file" },
    } as never);
    expect(setProfileStatus).toHaveBeenLastCalledWith(
      "File size exceeds the maximum allowed limit"
    );
  });
});
