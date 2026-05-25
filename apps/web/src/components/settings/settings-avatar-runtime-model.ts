export function resolveAvatarPreviewSource(
  sessionUser?: {
    email?: string | null;
    image?: string | null;
    name?: string | null;
  } | null
) {
  return sessionUser?.image ?? "";
}

export function resolveDisplayAvatar(input: {
  avatarPreview: string;
  profileImage: string;
  profileName: string;
  sessionUser?: {
    email?: string | null;
  } | null;
}) {
  return input.avatarPreview || input.profileImage || "";
}

export function resolveAvatarSeed(input: {
  profileName: string;
  sessionUser?: {
    email?: string | null;
    name?: string | null;
  } | null;
}) {
  return (
    input.profileName ||
    input.sessionUser?.name ||
    input.sessionUser?.email ||
    "user"
  );
}

export function resolveAvatarFallbackInitials(input: {
  profileName: string;
  sessionUser?: {
    name?: string | null;
  } | null;
}) {
  return (input.profileName || input.sessionUser?.name || "U")
    .slice(0, 2)
    .toUpperCase();
}

export function createAvatarUploadStartState() {
  return {
    avatarUploading: true,
    isUploadingAvatar: true,
    profileStatus: "Uploading avatar...",
  };
}

export function resolveUploadedAvatarUrl(
  uploaded:
    | {
        ufsUrl?: string | null;
        url?: string | null;
      }
    | undefined
) {
  return uploaded?.ufsUrl ?? uploaded?.url ?? null;
}

export function createAvatarUploadMissingUrlState() {
  return {
    profileStatus: "Unable to upload avatar.",
  };
}

export function createAvatarUploadSavedState(uploadedUrl: string) {
  return {
    avatarPreview: uploadedUrl,
    profileImage: uploadedUrl,
    profileStatus: "Avatar uploaded and saved.",
  };
}

export function createAvatarUploadFinishState() {
  return {
    avatarUploading: false,
    isUploadingAvatar: false,
  };
}
