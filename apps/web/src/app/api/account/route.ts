import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { deleteAuthUserById } from "@/lib/account-data";
import { SUDO_COOKIE_NAME, validateSudoCookie } from "@/lib/sudo";
import { getSessionUser } from "@/lib/workspace";

export async function DELETE() {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const sudoCookie = cookieStore.get(SUDO_COOKIE_NAME)?.value ?? null;
  const hasSudo = validateSudoCookie({ userId: currentUser.id, cookieValue: sudoCookie });
  if (!hasSudo) {
    return NextResponse.json({ error: "Sudo verification required" }, { status: 403 });
  }

  const deleted = await deleteAuthUserById(currentUser.id);

  if (!deleted) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SUDO_COOKIE_NAME);
  return response;
}
