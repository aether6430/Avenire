import { describe, expect, it } from "vitest";
import {
  createAccountsRefreshFailureState,
  createAccountsRefreshSuccessState,
  createLinkAccountStatus,
  createProfileSaveFailureState,
  createProfileSaveStartState,
  resolveLinkAccountFailureStatus,
  resolveProfileSaveStatus,
  resolveUnlinkAccountStatus,
  shouldLoadInitialAccounts,
  syncProfileDraftFromSession,
} from "@/components/settings/settings-account-runtime-model";

describe("settings account runtime model", () => {
  it("gates initial account loading to the account tab", () => {
    expect(
      shouldLoadInitialAccounts({
        accountsLoaded: false,
        currentTab: "account",
      })
    ).toBe(true);
    expect(
      shouldLoadInitialAccounts({
        accountsLoaded: true,
        currentTab: "account",
      })
    ).toBe(false);
    expect(
      shouldLoadInitialAccounts({
        accountsLoaded: false,
        currentTab: "billing",
      })
    ).toBe(false);
  });

  it("creates linked-account refresh success and failure states", () => {
    expect(
      createAccountsRefreshSuccessState({
        data: [
          { accountId: "github-user", id: "account-1", providerId: "github" },
        ],
      })
    ).toEqual({
      accounts: [
        { accountId: "github-user", id: "account-1", providerId: "github" },
      ],
      accountsErrorMessage: null,
      accountsLoadFailed: false,
    });
    expect(createAccountsRefreshSuccessState({})).toEqual({
      accounts: [],
      accountsErrorMessage: null,
      accountsLoadFailed: false,
    });
    expect(
      createAccountsRefreshSuccessState({
        data: { accountId: "github-user" },
      })
    ).toEqual({
      accounts: [],
      accountsErrorMessage: "Unable to load linked accounts.",
      accountsLoadFailed: true,
    });
    expect(
      createAccountsRefreshFailureState("accounts backend offline")
    ).toEqual({
      accounts: [],
      accountsErrorMessage: "accounts backend offline",
      accountsLoadFailed: true,
    });
  });

  it("resolves account-link and unlink statuses explicitly", () => {
    expect(createLinkAccountStatus("google")).toBe("Connecting google...");
    expect(resolveLinkAccountFailureStatus("github")).toBe(
      "Unable to connect github."
    );
    expect(resolveUnlinkAccountStatus({})).toBe("Account unlinked.");
    expect(resolveUnlinkAccountStatus({ error: "boom" })).toBe(
      "Unable to unlink account."
    );
  });

  it("syncs profile drafts from session and resolves save statuses", () => {
    expect(
      syncProfileDraftFromSession({
        image: "https://cdn.avenire.app/avatar.png",
        name: "Owner",
      })
    ).toEqual({
      profileImage: "https://cdn.avenire.app/avatar.png",
      profileName: "Owner",
    });
    expect(syncProfileDraftFromSession(null)).toEqual({
      profileImage: "",
      profileName: "",
    });
    expect(createProfileSaveStartState()).toEqual({
      isSavingProfile: true,
      profileStatus: "Saving...",
    });
    expect(createProfileSaveFailureState()).toEqual({
      profileStatus: "Unable to update profile.",
    });
    expect(resolveProfileSaveStatus({})).toBe("Profile updated.");
    expect(resolveProfileSaveStatus({ error: "boom" })).toBe(
      "Unable to update profile."
    );
  });
});
