"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";
import { resolveAuthClientBaseURL } from "./client-base-url";

type AuthAsyncCall = (...args: any[]) => Promise<any>;

interface PasskeyClientFacade {
  passkey: {
    addPasskey: AuthAsyncCall;
  };
}

const client: PasskeyClientFacade = createAuthClient({
  baseURL: resolveAuthClientBaseURL(),
  plugins: [passkeyClient()],
}) as PasskeyClientFacade;

export async function addPasskey() {
  return client.passkey.addPasskey({
    name: "Avenire Passkey",
  });
}
