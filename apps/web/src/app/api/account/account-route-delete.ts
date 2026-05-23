import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteAuthUserById } from "@/lib/account-data";
import { SUDO_COOKIE_NAME, validateSudoCookie } from "@/lib/sudo";
import {
  ACCOUNT_DELETE_ERROR,
  buildAccountDeleteSuccessBody,
  resolveAccountDeleteError,
  resolveAccountDeleteFailure,
} from "./account-route-model";

export async function handleAccountRouteDelete(input: { userId: string }) {
  try {
    const cookieStore = await cookies();
    const sudoCookie = cookieStore.get(SUDO_COOKIE_NAME)?.value ?? null;
    const hasSudo = validateSudoCookie({
      userId: input.userId,
      cookieValue: sudoCookie,
    });
    if (!hasSudo) {
      return NextResponse.json(
        { error: "Sudo verification required" },
        { status: 403 }
      );
    }

    const deleted = await deleteAuthUserById(input.userId);
    const failure = resolveAccountDeleteFailure(deleted);
    if (failure) {
      return NextResponse.json(
        { error: failure.error },
        { status: failure.status }
      );
    }

    const response = NextResponse.json(buildAccountDeleteSuccessBody());
    response.cookies.delete(SUDO_COOKIE_NAME);
    return response;
  } catch (error) {
    return NextResponse.json(
      {
        error: resolveAccountDeleteError(error, ACCOUNT_DELETE_ERROR),
      },
      { status: 500 }
    );
  }
}
