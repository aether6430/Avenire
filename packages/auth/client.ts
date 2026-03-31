"use client";

import { createAuthClient } from "better-auth/react";
import { lastLoginMethodClient } from "better-auth/client/plugins";
import { passkeyClient } from "@better-auth/passkey/client";
import { organizationClient, usernameClient } from "better-auth/client/plugins";
import { polarClient } from "@polar-sh/better-auth/client";

const client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [
    organizationClient(),
    passkeyClient(),
    usernameClient(),
    lastLoginMethodClient(),
    polarClient(),
  ]
});

export const authClient = {
  checkout: client.checkout as (...args: any[]) => Promise<any>,
  getLastUsedLoginMethod:
    client.getLastUsedLoginMethod as (() => string | null | undefined),
};

export const signIn = {
  email: client.signIn.email as (...args: any[]) => Promise<any>,
  passkey: client.signIn.passkey as (...args: any[]) => Promise<any>,
  social: client.signIn.social as (...args: any[]) => Promise<any>,
};

export const signUp = {
  email: client.signUp.email as (...args: any[]) => Promise<any>,
};

export const signOut = client.signOut;
export const useSession = client.useSession;
export const getSession = client.getSession;
export const $ERROR_CODES = client.$ERROR_CODES;
export const sendVerificationEmail =
  client.sendVerificationEmail as (...args: any[]) => Promise<any>;
export const linkSocial = client.linkSocial;
export const updateUser = client.updateUser as (...args: any[]) => Promise<any>;
export const listAccounts = client.listAccounts;
export const unlinkAccount = client.unlinkAccount;
export const listSessions = client.listSessions;
export const revokeSession = client.revokeSession;
export const revokeSessions = client.revokeSessions;
export const revokeOtherSessions = client.revokeOtherSessions;
export const deleteUser = client.deleteUser;
export const changePassword = client.changePassword;
export const requestPasswordReset =
  client.requestPasswordReset as (...args: any[]) => Promise<any>;
export const resetPassword = client.resetPassword;
