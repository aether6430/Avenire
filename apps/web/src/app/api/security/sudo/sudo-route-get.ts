import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSudoCookieExpiresAt, SUDO_COOKIE_NAME } from "@/lib/sudo";
import { resolveSudoStatus } from "./sudo-route-model";

export async function handleSudoRouteGet(input: { userId: string }) {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SUDO_COOKIE_NAME)?.value ?? null;
  const expiresAt = getSudoCookieExpiresAt({
    userId: input.userId,
    cookieValue,
  });

  return NextResponse.json(resolveSudoStatus(expiresAt));
}
