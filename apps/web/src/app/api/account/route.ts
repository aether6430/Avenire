import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/workspace";
import { handleAccountRouteDelete } from "./account-route-delete";

export async function DELETE() {
  const currentUser = await getSessionUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return await handleAccountRouteDelete({
    userId: currentUser.id,
  });
}
