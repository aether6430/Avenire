import type { AccountEntry } from "@/components/settings/settings-panel-model";

export function shouldLoadInitialAccounts(input: {
  accountsLoaded: boolean;
  currentTab: string;
}) {
  return input.currentTab === "account" && !input.accountsLoaded;
}

export function createAccountsRefreshSuccessState(result: unknown) {
  const data = (
    result as { data?: AccountEntry[] | null | unknown } | null | undefined
  )?.data;
  if (data == null) {
    return {
      accounts: [] as AccountEntry[],
      accountsErrorMessage: null,
      accountsLoadFailed: false,
    };
  }

  if (!Array.isArray(data)) {
    return {
      accounts: [] as AccountEntry[],
      accountsErrorMessage: "Unable to load linked accounts.",
      accountsLoadFailed: true,
    };
  }

  return {
    accounts: data as AccountEntry[],
    accountsErrorMessage: null,
    accountsLoadFailed: false,
  };
}

export function createAccountsRefreshFailureState(
  errorMessage?: string | null
) {
  return {
    accounts: [] as AccountEntry[],
    accountsErrorMessage:
      errorMessage?.trim() || "Unable to load linked accounts.",
    accountsLoadFailed: true,
  };
}

export function createLinkAccountStatus(provider: "github" | "google") {
  return `Connecting ${provider}...`;
}

export function resolveLinkAccountFailureStatus(provider: "github" | "google") {
  return `Unable to connect ${provider}.`;
}

export function resolveUnlinkAccountStatus(result: { error?: unknown }) {
  return result.error ? "Unable to unlink account." : "Account unlinked.";
}

export function syncProfileDraftFromSession(
  sessionUser?: {
    image?: string | null;
    name?: string | null;
  } | null
) {
  return {
    profileImage: sessionUser?.image ?? "",
    profileName: sessionUser?.name ?? "",
  };
}

export function createProfileSaveStartState() {
  return {
    isSavingProfile: true,
    profileStatus: "Saving...",
  };
}

export function resolveProfileSaveStatus(result: { error?: unknown }) {
  return result.error ? "Unable to update profile." : "Profile updated.";
}

export function createProfileSaveFailureState() {
  return {
    profileStatus: "Unable to update profile.",
  };
}
