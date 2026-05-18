import type { AccountEntry } from "@/components/settings/settings-panel-model";

export function shouldLoadInitialAccounts(input: {
  accountsLoaded: boolean;
  currentTab: string;
}) {
  return input.currentTab === "account" && !input.accountsLoaded;
}

export function createAccountsRefreshSuccessState(result: unknown) {
  return {
    accounts: ((result as { data?: AccountEntry[] | null } | null | undefined)
      ?.data ?? []) as AccountEntry[],
    accountsLoadFailed: false,
  };
}

export function createAccountsRefreshFailureState() {
  return {
    accounts: [] as AccountEntry[],
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
