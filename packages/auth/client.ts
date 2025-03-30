import { createAuthClient } from "better-auth/react";
import { passkeyClient } from "better-auth/client/plugins";
import { usernameClient } from "better-auth/client/plugins";

export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
  passkey,
  $ERROR_CODES,
  sendVerificationEmail,
  linkSocial,
  updateUser,
  useListPasskeys,
  listAccounts,
  unlinkAccount,
  listSessions,
  revokeSession,
  revokeSessions,
  revokeOtherSessions,
  deleteUser,
  changePassword,
  forgetPassword,
  resetPassword
} = createAuthClient({
  baseURL: process.env.BASE_URL,
  plugins: [passkeyClient(), usernameClient()],
});
