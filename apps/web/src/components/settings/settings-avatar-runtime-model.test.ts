import { describe, expect, it } from "vitest";
import {
  createAvatarUploadFinishState,
  createAvatarUploadMissingUrlState,
  createAvatarUploadSavedState,
  createAvatarUploadStartState,
  resolveAvatarFallbackInitials,
  resolveAvatarPreviewSource,
  resolveAvatarSeed,
  resolveDisplayAvatar,
  resolveUploadedAvatarUrl,
} from "@/components/settings/settings-avatar-runtime-model";

describe("settings avatar runtime model", () => {
  it("derives preview, display avatar, and fallback initials from session/profile state", () => {
    expect(
      resolveAvatarPreviewSource({
        email: "owner@example.com",
        image: "https://cdn.avenire.app/avatar.png",
        name: "Owner",
      })
    ).toBe("https://cdn.avenire.app/avatar.png");
    expect(
      resolveAvatarPreviewSource({
        email: "owner@example.com",
        image: null,
        name: "Owner",
      })
    ).toBe("");

    expect(
      resolveDisplayAvatar({
        avatarPreview: "https://cdn.avenire.app/preview.png",
        profileImage: "https://cdn.avenire.app/profile.png",
        profileName: "Owner",
        sessionUser: { email: "owner@example.com" },
      })
    ).toBe("https://cdn.avenire.app/preview.png");
    expect(
      resolveDisplayAvatar({
        avatarPreview: "",
        profileImage: "https://cdn.avenire.app/profile.png",
        profileName: "Owner",
        sessionUser: { email: "owner@example.com" },
      })
    ).toBe("https://cdn.avenire.app/profile.png");
    expect(
      resolveDisplayAvatar({
        avatarPreview: "",
        profileImage: "",
        profileName: "Owner",
        sessionUser: { email: "owner@example.com" },
      })
    ).toBe("");

    expect(
      resolveAvatarFallbackInitials({
        profileName: "Owner",
        sessionUser: { name: "Other" },
      })
    ).toBe("OW");
    expect(
      resolveAvatarFallbackInitials({
        profileName: "",
        sessionUser: { name: "Ada" },
      })
    ).toBe("AD");
    expect(
      resolveAvatarSeed({
        profileName: "",
        sessionUser: { email: "owner@example.com", name: "Ada" },
      })
    ).toBe("Ada");
  });

  it("derives upload start, success, missing-url, and finish states", () => {
    expect(createAvatarUploadStartState()).toEqual({
      avatarUploading: true,
      isUploadingAvatar: true,
      profileStatus: "Uploading avatar...",
    });
    expect(resolveUploadedAvatarUrl(undefined)).toBeNull();
    expect(
      resolveUploadedAvatarUrl({ url: "https://cdn.avenire.app/url.png" })
    ).toBe("https://cdn.avenire.app/url.png");
    expect(
      resolveUploadedAvatarUrl({
        ufsUrl: "https://cdn.avenire.app/ufs.png",
        url: "https://cdn.avenire.app/url.png",
      })
    ).toBe("https://cdn.avenire.app/ufs.png");
    expect(createAvatarUploadMissingUrlState()).toEqual({
      profileStatus: "Unable to upload avatar.",
    });
    expect(
      createAvatarUploadSavedState("https://cdn.avenire.app/avatar.png")
    ).toEqual({
      avatarPreview: "https://cdn.avenire.app/avatar.png",
      profileImage: "https://cdn.avenire.app/avatar.png",
      profileStatus: "Avatar uploaded and saved.",
    });
    expect(createAvatarUploadFinishState()).toEqual({
      avatarUploading: false,
      isUploadingAvatar: false,
    });
  });
});
