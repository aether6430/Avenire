"use client";

import { createAuthClient } from "better-auth/react";

type AuthAsyncCall = (...args: any[]) => Promise<any>;
type AuthSyncCall<T = any> = (...args: any[]) => T;

interface AppAuthClientFacade {
  $ERROR_CODES: unknown;
  changePassword: AuthAsyncCall;
  deleteUser: AuthAsyncCall;
  getSession: AuthAsyncCall;
  linkSocial: AuthAsyncCall;
  listAccounts: AuthAsyncCall;
  listSessions: AuthAsyncCall;
  requestPasswordReset: AuthAsyncCall;
  resetPassword: AuthAsyncCall;
  revokeOtherSessions: AuthAsyncCall;
  revokeSession: AuthAsyncCall;
  revokeSessions: AuthAsyncCall;
  sendVerificationEmail: AuthAsyncCall;
  signOut: AuthAsyncCall;
  unlinkAccount: AuthAsyncCall;
  updateUser: AuthAsyncCall;
  useSession: AuthSyncCall;
}

const client: AppAuthClientFacade = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
}) as AppAuthClientFacade;

export const signOut = client.signOut;
export const useSession = client.useSession;
export const getSession = client.getSession;
export const $ERROR_CODES = client.$ERROR_CODES;
export const sendVerificationEmail = client.sendVerificationEmail;
export const linkSocial = client.linkSocial;
export const updateUser = client.updateUser;
export const listAccounts = client.listAccounts;
export const unlinkAccount = client.unlinkAccount;
export const listSessions = client.listSessions;
export const revokeSession = client.revokeSession;
export const revokeSessions = client.revokeSessions;
export const revokeOtherSessions = client.revokeOtherSessions;
export const deleteUser = client.deleteUser;
export const changePassword = client.changePassword;
export const requestPasswordReset = client.requestPasswordReset;
export const resetPassword = client.resetPassword;
