"use client";

import { passkeyClient } from "@better-auth/passkey/client";
import { createAuthClient } from "better-auth/react";

type AuthAsyncCall = (...args: any[]) => Promise<any>;

interface PasskeyClientFacade {
  passkey: {
    addPasskey: AuthAsyncCall;
  };
}

const client: PasskeyClientFacade = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL,
  plugins: [passkeyClient()],
}) as PasskeyClientFacade;

export async function addPasskey() {
  return client.passkey.addPasskey({
    name: "Avenire Passkey",
  });
}
